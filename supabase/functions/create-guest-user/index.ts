// create-guest-user — tạo/gia hạn tài khoản KHÁCH ĐỐI TÁC (role guest, có thời hạn).
// Guest KHÔNG có dòng profiles (vô hình với dữ liệu nhân sự); quyền xem do RLS
// (guest_active + is_shared_with_guests) quyết định. Caller: tcth_admin/system_admin.
//
// KHÔNG CẦN EMAIL: đối tác chỉ cần một tên đăng nhập, hệ thống ghép email nội bộ
// `<user>@khach.343skill.com` cho Supabase Auth (không có hòm thư thật phía sau).
// Vì thế khách không tự đặt lại mật khẩu qua email được — cờ `reset_password`
// cho Phòng TCTH cấp lại mật khẩu tạm ngay tại màn quản trị.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { STAFF_CREATOR_ROLES } from "../_shared/roles.ts";
import { type GuestScreen, sanitizeGuestScreens } from "../_shared/guestScreens.ts";
import { emailFromUsername, isValidUsername, normalizeUsername } from "../_shared/guestLogin.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mật khẩu tạm mạnh (chữ hoa/thường + số + ký hiệu) — cùng cách sinh với staff. */
function generatePassword(length = 16): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

interface GuestInput {
  /** Tên đăng nhập do quản trị viên đặt — cách cấp tài khoản hiện nay */
  username?: string;
  /** Email thật; chỉ còn dùng cho các tài khoản khách cấp trước 08/2026 */
  email?: string;
  display_name: string;
  organization?: string;
  note?: string;
  /** ISO timestamp — hạn truy cập */
  expires_at: string;
  /** Mã các màn hình cổng ONE được mở; bỏ trống → bộ mặc định */
  allowed_screens?: string[];
  /** Sinh lại mật khẩu tạm cho tài khoản khách đã có (khách quên mật khẩu) */
  reset_password?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireRole(req, STAFF_CREATOR_ROLES);
    const body = (await req.json()) as GuestInput;

    // Tên đăng nhập là đường chính; email chỉ nhận cho tài khoản cũ đã cấp bằng
    // email thật (gia hạn/sửa màn hình vẫn phải chạy được cho họ).
    let email: string;
    if (body.username !== undefined && body.username !== null && body.username !== "") {
      const username = normalizeUsername(String(body.username));
      if (!isValidUsername(username)) {
        throw new HttpError(
          "Tên đăng nhập cần 3–32 ký tự, chỉ gồm chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới",
          400,
        );
      }
      email = emailFromUsername(username);
    } else {
      email = (body.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw new HttpError("Cần tên đăng nhập cho tài khoản khách", 400);
    }

    const displayName = (body.display_name ?? "").trim();
    const expiresAt = new Date(body.expires_at ?? "");
    if (!displayName) throw new HttpError("Thiếu tên hiển thị", 400);
    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new HttpError("Hạn truy cập phải là thời điểm trong tương lai", 400);
    }

    // Mã lạ bị loại tại đây chứ không để CHECK của bảng ném lỗi khó hiểu
    const allowedScreens: GuestScreen[] = sanitizeGuestScreens(body.allowed_screens);

    const admin = caller.adminClient;

    // Đã có auth user với email này chưa? (kể cả cán bộ — không cho biến cán bộ thành guest)
    let userId: string | null = null;
    const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = page?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    let tempPassword: string | null = null;
    let createdNew = false;

    if (existing) {
      userId = existing.id;
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (roleRow && roleRow.role !== "guest") {
        throw new HttpError("Tên đăng nhập này thuộc tài khoản cán bộ — không thể cấp quyền khách", 400);
      }
      // Khách không có email thật để tự đặt lại mật khẩu: quản trị viên cấp lại
      // mật khẩu tạm, khách buộc phải đổi ở lần đăng nhập kế tiếp.
      if (body.reset_password) {
        tempPassword = generatePassword();
        const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          user_metadata: { ...existing.user_metadata, must_change_password: true },
        });
        if (pwErr) throw new HttpError(`Không cấp lại được mật khẩu: ${pwErr.message}`, 400);
      }
    } else {
      tempPassword = generatePassword();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: displayName, must_change_password: true, is_guest: true },
      });
      if (error || !data.user) {
        throw new HttpError(`Không tạo được tài khoản: ${error?.message ?? "unknown"}`, 400);
      }
      userId = data.user.id;
      createdNew = true;
    }

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "guest" }, { onConflict: "user_id" });
    if (roleErr) throw new HttpError(`Không gán được vai trò guest: ${roleErr.message}`, 400);

    const { error: gaErr } = await admin.from("guest_access").upsert({
      user_id: userId,
      email,
      display_name: displayName,
      organization: (body.organization ?? "").trim() || null,
      note: (body.note ?? "").trim() || null,
      expires_at: expiresAt.toISOString(),
      allowed_screens: allowedScreens,
      created_by: caller.userId,
    });
    if (gaErr) throw new HttpError(`Không lưu được hồ sơ khách: ${gaErr.message}`, 400);

    try {
      await admin.from("audit_logs").insert({
        user_id: caller.userId,
        action: "create_guest_user",
        entity_type: "guest_account",
        entity_id: userId,
        new_data: {
          target_email: email,
          display_name: displayName,
          expires_at: expiresAt.toISOString(),
          allowed_screens: allowedScreens,
          created_new: createdNew,
          reset_password: !!body.reset_password,
        },
      });
    } catch (e) {
      console.error("audit_logs insert failed:", e);
    }

    return jsonResponse({
      user_id: userId,
      created_new: createdNew,
      // Trả lại đúng chuỗi khách sẽ gõ ở ô đăng nhập — màn quản trị đọc cho đối
      // tác cùng mật khẩu tạm, không phải tự nhớ mình vừa đặt tên gì
      username: email.split("@")[0],
      login_email: email,
      temp_password: tempPassword,
      message: createdNew
        ? "Đã tạo tài khoản khách. Gửi mật khẩu tạm cho đối tác qua kênh an toàn — họ sẽ phải đổi khi đăng nhập lần đầu."
        : body.reset_password
        ? "Đã cấp lại mật khẩu tạm cho tài khoản khách."
        : "Đã cập nhật hạn truy cập cho tài khoản khách hiện có.",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error("create-guest-user error:", error);
    return jsonResponse({ error: (error as Error).message ?? "Lỗi không xác định" }, 400);
  }
});
