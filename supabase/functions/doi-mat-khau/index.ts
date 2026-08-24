import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, HttpError } from "../_shared/auth.ts";

/**
 * ĐỔI MẬT KHẨU CỦA CHÍNH MÌNH — và xoá cờ "bắt buộc đổi mật khẩu" trong CÙNG một thao tác.
 *
 * VÌ SAO PHẢI CÓ HÀM NÀY (thay vì để client tự gọi updateUser như trước):
 * Cờ must_change_password trước đây nằm ở user_metadata, mà user_metadata thì CHÍNH NGƯỜI
 * DÙNG sửa được. Ai cầm mật khẩu tạm do quản trị cấp chỉ cần gõ một câu trong console
 *     supabase.auth.updateUser({ data: { must_change_password: false } })
 * là thoát được yêu cầu đổi, rồi dùng mãi mật khẩu tạm — đúng thứ mà biện pháp ép đổi
 * sinh ra để ngăn. Mật khẩu tạm thường đơn giản và đã bị nhìn thấy lúc bàn giao.
 *
 * Cờ nay chuyển sang app_metadata (CHỈ máy chủ ghi được). Chốt chặn nằm ở chỗ: nơi DUY NHẤT
 * xoá được cờ là hàm này, và hàm này chỉ xoá SAU KHI đã thực sự đặt mật khẩu mới. Muốn bỏ
 * cờ thì buộc phải đổi mật khẩu thật — không còn đường tắt.
 *
 * VÌ SAO KHÔNG KIỂM MẬT KHẨU HIỆN TẠI Ở ĐÂY: kiểm bằng cách đăng nhập thử phải đi qua cửa
 * /token của Auth, mà cửa đó đang bật kiểm captcha — gọi từ máy chủ sẽ hỏng. Việc kiểm mật
 * khẩu hiện tại vẫn do trang đổi mật khẩu làm (kèm token Turnstile), và chốt chặn thật cho
 * đường này là JWT: phải đang đăng nhập hợp lệ mới gọi được.
 */

const DAI_TOI_THIEU = 8;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError("Phương thức không được hỗ trợ", 405);
    }

    // --- Xác thực người gọi: phải là phiên đăng nhập THẬT, có soi chữ ký ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new HttpError("Thiếu thông tin xác thực", 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: loiUser } = await userClient.auth.getUser();
    if (loiUser || !user) throw new HttpError("Phiên đăng nhập không hợp lệ", 401);

    // --- Mật khẩu mới ---
    const body = await req.json().catch(() => ({}));
    const matKhauMoi = typeof body?.matKhauMoi === "string" ? body.matKhauMoi : "";
    if (matKhauMoi.length < DAI_TOI_THIEU) {
      throw new HttpError(`Mật khẩu mới cần ít nhất ${DAI_TOI_THIEU} ký tự`, 400);
    }

    // --- Đặt mật khẩu mới + hạ cờ ở CẢ HAI nơi, trong một lần gọi ---
    // Giữ nguyên các khoá khác của metadata: ghi đè cả cụm sẽ xoá mất full_name,
    // is_guest… mà nhiều màn hình đang đọc.
    const admin = getAdminClient();
    const { error: loiCapNhat } = await admin.auth.admin.updateUserById(user.id, {
      password: matKhauMoi,
      app_metadata: { ...(user.app_metadata ?? {}), must_change_password: false },
      user_metadata: { ...(user.user_metadata ?? {}), must_change_password: false },
    });
    if (loiCapNhat) throw new HttpError(loiCapNhat.message, 400);

    return jsonResponse({ ok: true });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Lỗi không xác định";
    return jsonResponse({ ok: false, error: message }, status);
  }
});
