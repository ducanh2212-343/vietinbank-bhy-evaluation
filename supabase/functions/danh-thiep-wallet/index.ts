// danh-thiep-wallet — nút «Thêm vào Google Wallet» trên danh thiếp số.
//
// Khách bấm nút → hàm này đọc thẻ qua nc_resolve_card(), dựng đối tượng Generic
// pass, KÝ JWT bằng khoá riêng của tài khoản dịch vụ Google rồi chuyển hướng
// sang https://pay.google.com/gp/v/save/<jwt>. Google mở màn «Lưu vào Wallet».
//
// Vì sao ký ở máy chủ: khoá riêng RSA không được xuống trình duyệt. Vì sao
// chuyển hướng chứ không trả JSON: iOS/Android mở link trực tiếp mượt hơn, và
// khách không phải bấm hai lần.
//
// Hàm công khai (verify_jwt = false) như danh-thiep-vcard: dữ liệu đã được
// nc_resolve_card() lọc theo ma trận quyền hiển thị, anon vốn gọi được hàm đó.
//
// Cần ba biến bí mật (Supabase → Edge Functions → Secrets):
//   GOOGLE_WALLET_SA_EMAIL   email tài khoản dịch vụ
//   GOOGLE_WALLET_SA_KEY     khoá riêng PEM (giữ nguyên xuống dòng hoặc \n)
//   GOOGLE_WALLET_ORIGIN     gốc trang thẻ, ví dụ https://bachungyenone.com
// và hai khoá cấu hình trong nc_cau_hinh: google_wallet_issuer_id,
// google_wallet_class_suffix.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  dungDoiTuongWallet, dungThanJwtWallet, type BanDichWallet, type MaNgonNguWallet, type TheChoWallet,
} from "../_shared/googleWallet.ts";
import { chonBanDich, laMaNgonNgu, suyNgonNgu } from "../_shared/danhThiepNgonNgu.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function loi(thongBao: string, ma: number): Response {
  return new Response(thongBao, {
    status: ma,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** base64url không đệm — JWT không nhận '=' , '+' , '/'. */
function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Đọc khoá riêng PEM (PKCS#8) thành CryptoKey RS256. Khoá dán từ tệp JSON của
 * Google thường mang \n dạng hai ký tự — phải đổi lại thành xuống dòng thật.
 */
async function napKhoa(pem: string): Promise<CryptoKey> {
  const than = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(than), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function kyJwt(than: Record<string, unknown>, khoa: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const dau = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const giua = b64url(enc.encode(JSON.stringify(than)));
  const chuKy = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    khoa,
    enc.encode(`${dau}.${giua}`),
  );
  return `${dau}.${giua}.${b64url(new Uint8Array(chuKy))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return loi("Thiếu tham số slug", 400);

  const uuTien = (req.headers.get("accept-language") ?? "")
    .split(",").map((s) => s.split(";")[0].trim()).filter(Boolean);
  const thamSoLang = url.searchParams.get("lang");
  const lang: MaNgonNguWallet = (laMaNgonNgu(thamSoLang)
    ? thamSoLang
    : suyNgonNgu(uuTien)) as MaNgonNguWallet;

  const saEmail = Deno.env.get("GOOGLE_WALLET_SA_EMAIL") ?? "";
  const saKey = Deno.env.get("GOOGLE_WALLET_SA_KEY") ?? "";
  const goc = Deno.env.get("GOOGLE_WALLET_ORIGIN") ?? "https://bachungyenone.com";
  if (!saEmail || !saKey) {
    // Nói rõ để Phòng TCTH biết phải làm gì, thay vì lỗi 500 trống
    return loi(
      "Chưa cấu hình Google Wallet: thiếu biến bí mật GOOGLE_WALLET_SA_EMAIL / GOOGLE_WALLET_SA_KEY.",
      503,
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: cauHinhRows } = await supabase
    .from("nc_cau_hinh")
    .select("khoa, gia_tri")
    .in("khoa", ["google_wallet_issuer_id", "google_wallet_class_suffix", "google_wallet_bat"]);
  const cauHinh: Record<string, unknown> = {};
  for (const r of cauHinhRows ?? []) cauHinh[r.khoa as string] = r.gia_tri;

  const issuerId = typeof cauHinh.google_wallet_issuer_id === "string"
    ? cauHinh.google_wallet_issuer_id.trim()
    : "";
  const classSuffix = typeof cauHinh.google_wallet_class_suffix === "string"
    ? cauHinh.google_wallet_class_suffix.trim()
    : "danh_thiep_v1";
  if (!issuerId) return loi("Chưa cấu hình Issuer ID của Google Wallet ở màn Quản trị VCard.", 503);

  const { data: the, error } = await supabase.rpc("nc_resolve_card", { _slug: slug, _xem_truoc: false });
  if (error) return loi("Không đọc được thẻ", 500);
  const tt = (the as { status?: string } | null)?.status;
  if (tt !== "ok") return loi("Thẻ không tồn tại hoặc đã thu hồi", 404);
  if ((the as { wallet?: boolean }).wallet !== true) {
    return loi("Thẻ này không mở tính năng Google Wallet", 403);
  }

  const doiTuong = dungDoiTuongWallet(
    the as unknown as TheChoWallet,
    { issuerId, classSuffix, lang },
    (bd, l) => chonBanDich(bd as BanDichWallet, l),
  );
  const than = dungThanJwtWallet(doiTuong, saEmail, goc, Math.floor(Date.now() / 1000));

  let jwt: string;
  try {
    jwt = await kyJwt(than, await napKhoa(saKey));
  } catch {
    return loi("Khoá Google Wallet không hợp lệ — kiểm tra lại GOOGLE_WALLET_SA_KEY (định dạng PKCS#8).", 500);
  }

  // Ghi nhận một lượt «lưu vào ví» để thống kê 30 ngày trên màn của cán bộ
  await supabase.rpc("nc_ghi_nhat_ky_quet", {
    _slug: slug, _lang: lang, _channel: "wallet", _action: "save_vcard", _country: null,
  });

  return new Response(null, {
    status: 302,
    headers: { ...cors, Location: `https://pay.google.com/gp/v/save/${jwt}` },
  });
});
