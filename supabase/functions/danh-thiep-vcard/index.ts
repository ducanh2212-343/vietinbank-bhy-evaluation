// danh-thiep-vcard — trả tệp .vcf (vCard 3.0, UTF-8) cho khách quét danh thiếp số.
//
// Vì sao là edge function chứ không sinh ở trình duyệt: iOS Safari chỉ mở thẳng
// màn «Thêm liên hệ» khi tải một URL thật trả về Content-Type text/vcard; tệp
// tạo bằng Blob trên máy khách khi mở khi không (Mục 7.2 đặc tả). Hàm này công
// khai (verify_jwt = false): dữ liệu đã được nc_resolve_card() lọc theo ma trận
// quyền hiển thị và anon vốn gọi được hàm đó — không lộ gì thêm.
//
// Ngôn ngữ: ?lang= (khách bấm trên thẻ) → Accept-Language. Không lưu IP.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { taoVcard, tenTepVcard } from "../_shared/vcard.ts";
import {
  chonBanDich, laMaNgonNgu, suyNgonNgu, suyQuocGia, type BanDich, type MaNgonNgu,
} from "../_shared/danhThiepNgonNgu.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const DA_CHUYEN: Record<MaNgonNgu, string> = {
  vi: "Cán bộ này đã chuyển công tác. Vui lòng liên hệ Chi nhánh.",
  en: "This staff member has moved to another position. Please contact the branch.",
  zh_hans: "该员工已调离岗位，请联系分行。",
  zh_hant: "該員工已調離崗位，請聯絡分行。",
  ko: "해당 직원은 다른 부서로 이동하였습니다. 지점으로 연락해 주십시오.",
  ja: "この担当者は異動しました。支店までご連絡ください。",
};

interface DonViTrenThe { code: string; name: BanDich; addr: BanDich }
interface KenhTrenThe { type: string; value?: string }
interface PayloadThe {
  status: string;
  slug: string;
  card_url: string;
  name: { vi: string; latin?: string; zh?: string; ko?: string; ja?: string };
  title?: BanDich;
  units: DonViTrenThe[];
  addr: BanDich;
  phone_mobile?: string;
  phone_office?: string;
  email?: string;
  photo_url?: string;
  bank_line: boolean;
  channels: KenhTrenThe[];
  contact?: { name?: BanDich; addr?: BanDich; phone?: string };
}

function vanBan(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return vanBan("Method not allowed", 405);

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) {
    return vanBan("Bad request", 400);
  }
  const uuTien = (req.headers.get("accept-language") ?? "")
    .split(",").map((s) => s.split(";")[0].trim()).filter(Boolean);
  const langParam = url.searchParams.get("lang");
  const lang: MaNgonNgu = laMaNgonNgu(langParam) ? langParam : suyNgonNgu(uuTien);
  const kenhRaw = url.searchParams.get("c");
  const kenh = kenhRaw === "qr" || kenhRaw === "nfc" || kenhRaw === "wallet" ? kenhRaw : "direct";

  // Anon key là đủ: hai RPC dưới đây đã cấp cho anon; không cần service role.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.rpc("nc_resolve_card", { _slug: slug });
  if (error) return vanBan("Service unavailable", 503);
  const p = data as PayloadThe;
  if (!p || p.status === "not_found") return vanBan("Not found", 404);
  if (p.status === "revoked") {
    const lienHe = [chonBanDich(p.contact?.name, lang), p.contact?.phone ?? "", chonBanDich(p.contact?.addr, lang)]
      .filter(Boolean).join(" · ");
    return vanBan(`${DA_CHUYEN[lang]}${lienHe ? `\n${lienHe}` : ""}`, 410);
  }

  const cjk = lang === "zh_hans" || lang === "zh_hant" ? p.name.zh : lang === "ko" ? p.name.ko : lang === "ja" ? p.name.ja : undefined;
  const donVi = p.units.map((u) => chonBanDich(u.name, lang)).filter(Boolean);
  // Ghi chú: bản tiếng Việt của chức danh/đơn vị để trợ lý người Việt của khách
  // vẫn tra được; thêm kênh chat để khách khỏi phải mở lại thẻ.
  const ghiChu: string[] = [];
  if (lang !== "vi") {
    const viTitle = chonBanDich(p.title, "vi");
    const viUnits = p.units.map((u) => chonBanDich(u.name, "vi")).filter(Boolean).join(" - ");
    if (viTitle || viUnits) ghiChu.push([viTitle, viUnits].filter(Boolean).join(" | "));
  }
  for (const k of p.channels ?? []) {
    if (k.value && k.type !== "wechat" && k.type !== "kakaotalk") {
      const ten = k.type === "zalo" ? "Zalo" : k.type === "line" ? "LINE" : k.type === "whatsapp" ? "WhatsApp" : k.type === "linkedin" ? "LinkedIn" : k.type;
      ghiChu.push(`${ten}: ${k.value}`);
    }
  }

  const vcf = taoVcard({
    hoTen: p.name.vi,
    hoTenLatin: p.name.latin ?? p.name.vi,
    tenBanDia: cjk,
    chucDanh: chonBanDich(p.title, lang) || undefined,
    donVi,
    diaChi: chonBanDich(p.addr, lang) || undefined,
    sdtDiDong: p.phone_mobile,
    sdtCoQuan: p.phone_office,
    email: p.email,
    url: p.card_url,
    anh: p.photo_url,
    ghiChu: ghiChu.length ? ghiChu.join("\n") : undefined,
  });

  await supabase.rpc("nc_ghi_nhat_ky_quet", {
    _slug: slug, _lang: lang, _channel: kenh, _action: "save_vcard", _country: suyQuocGia(uuTien),
  }).then(() => undefined, () => undefined);

  const tenTep = tenTepVcard(p.name.latin ?? p.name.vi, lang);
  return new Response(vcf, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/vcard; charset=utf-8",
      // inline: iOS Safari mở thẳng màn xem trước liên hệ; Android vẫn tải về và
      // đề nghị mở bằng Danh bạ
      "Content-Disposition": `inline; filename="${tenTep}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
});
