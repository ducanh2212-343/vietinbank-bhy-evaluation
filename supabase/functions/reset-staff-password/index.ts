// reset-staff-password — cấp lại mật khẩu cho một cán bộ đã có tài khoản.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
// Hai chế độ:
//   • Mặc định: sinh mật khẩu tạm, trả về màn hình admin 1 lần để bàn giao (Zalo/SMS),
//     bật cờ must_change_password → cán bộ đổi ngay lần đăng nhập kế tiếp.
//   • send_email=true: KHÔNG đổi mật khẩu, gửi email link đặt lại cho cán bộ (qua Resend);
//     cán bộ bấm link là vào thẳng trang đặt mật khẩu mới. Admin không thấy mật khẩu.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { isElevatedRole, STAFF_CREATOR_ROLES } from "../_shared/roles.ts";
import { generatePassword, writeAuditLog } from "../_shared/staff.ts";
import { APP_URL } from "../_shared/email-config.ts";

// Miền được phép nhận link đặt lại mật khẩu.
//
// VÌ SAO PHẢI KIỂM MIỀN (vá 24/08/2026): bản cũ chỉ kiểm giao thức https và
// đường dẫn "/dat-lai-mat-khau", nên https://trang-gia-mao.example/dat-lai-mat-khau
// vẫn lọt. Link đặt lại mang theo token khôi phục — ai dựng một trang cùng đường
// dẫn ở miền của mình là hứng trọn token và chiếm được tài khoản cán bộ, mà quản
// trị viên bấm nút vẫn thấy mọi thứ bình thường.
//
// Lấy từ secret RESET_REDIRECT_DOMAINS (các miền ngăn cách bằng dấu phẩy) để đổi
// tên miền không phải deploy lại — cùng nếp APP_URL/EMAIL_FROM_DOMAIN ở
// _shared/email-config.ts. Mặc định gồm: miền của APP_URL, miền chính
// bachungyenone.com và miền cũ chieuthuc3.com (giai đoạn chuyển tiếp vẫn vào
// được — chặn nhầm nó thì cán bộ còn dùng dấu trang cũ sẽ mất đường đặt lại).
const MIEN_CHO_PHEP: ReadonlySet<string> = (() => {
  const ds = new Set<string>();
  const them = (giaTri: string) => {
    const host = giaTri.trim().toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!host) return;
    ds.add(host);
    // Chấp nhận cả biến thể www: hai địa chỉ này là cùng một cổng.
    ds.add(host.startsWith("www.") ? host.slice(4) : `www.${host}`);
  };
  try {
    them(new URL(APP_URL).host);
  } catch { /* APP_URL hỏng thì vẫn còn các miền mặc định bên dưới */ }
  for (const m of (Deno.env.get("RESET_REDIRECT_DOMAINS") || "").split(",")) them(m);
  them("bachungyenone.com");
  them("chieuthuc3.com");
  return ds;
})();

// Chỉ chấp nhận redirect https, ĐÚNG MIỀN của cổng, tới đúng trang đặt lại mật
// khẩu (chống open-redirect). Allow-list của Supabase Auth là chốt chặn cuối;
// đây là lớp phòng vệ thêm.
// Không hợp lệ thì rơi về link chuẩn của APP_URL chứ KHÔNG báo lỗi: quản trị
// viên chạy trên máy cá nhân (localhost) hay bản xem thử vẫn gửi được thư, chỉ
// là link trỏ về địa chỉ thật của cổng.
function safeResetRedirect(input: unknown): string {
  const fallback = `${APP_URL}/dat-lai-mat-khau`;
  if (typeof input !== "string") return fallback;
  try {
    const u = new URL(input);
    if (u.protocol === "https:" && u.pathname === "/dat-lai-mat-khau") {
      if (MIEN_CHO_PHEP.has(u.host.toLowerCase())) return input;
      console.warn("Bỏ qua redirect_to ngoài danh sách miền cho phép", { host: u.host });
    }
  } catch { /* ignore */ }
  return fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireRole(req, STAFF_CREATOR_ROLES);
    const adminClient = caller.adminClient;

    const body = await req.json().catch(() => ({}));
    const profileId = typeof body?.profile_id === "string" ? body.profile_id : null;
    if (!profileId) throw new HttpError("Thiếu profile_id", 400);
    const sendEmail = body?.send_email === true;
    const resetRedirect = safeResetRedirect(body?.redirect_to);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, email, full_name")
      .eq("id", profileId)
      .maybeSingle();
    if (profileError) throw new HttpError(`Lỗi tra cứu hồ sơ: ${profileError.message}`, 400);
    if (!profile) throw new HttpError("Không tìm thấy hồ sơ cán bộ", 404);
    if (!profile.user_id) {
      throw new HttpError("Cán bộ này chưa có tài khoản đăng nhập — hãy tạo tài khoản trước", 400);
    }

    // Không cho tự cấp lại mật khẩu của chính mình qua đường admin (dùng trang Đổi mật khẩu).
    if (profile.user_id === caller.userId) {
      throw new HttpError("Không thể tự cấp lại mật khẩu cho chính mình — dùng trang Đổi mật khẩu", 400);
    }

    // Chống leo thang: tcth_admin không được cấp lại mật khẩu cho tài khoản đang giữ
    // vai trò quản trị. Thiếu chốt này, một tcth_admin đặt lại mật khẩu của system_admin
    // rồi dùng temp_password trả về ở cuối hàm để đăng nhập, chiếm toàn quyền hệ thống.
    // Cùng khuôn với update-staff-email và _shared/staff.ts.
    if (!caller.roles.includes("system_admin")) {
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      if (isElevatedRole((roleRow as { role: string } | null)?.role ?? null)) {
        throw new HttpError(
          "Tài khoản này đang giữ vai trò quản trị — chỉ Quản trị hệ thống mới được cấp lại mật khẩu.",
          403,
        );
      }
    }

    // Email ĐĂNG NHẬP thật nằm ở auth.users — profiles.email có thể lệch (vd hồ sơ
    // được sửa tay). Mọi hiển thị "tên đăng nhập" và link đặt lại phải dùng email Auth,
    // nếu không admin sẽ bàn giao nhầm tên đăng nhập cho cán bộ (mật khẩu đúng, email sai).
    const { data: existingUser, error: getUserError } = await adminClient.auth.admin
      .getUserById(profile.user_id);
    if (getUserError || !existingUser?.user) {
      throw new HttpError("Không tìm thấy tài khoản đăng nhập của cán bộ này", 404);
    }
    const authEmail = existingUser.user.email ?? null;
    const emailMismatch = !!authEmail && !!profile.email &&
      authEmail.toLowerCase() !== profile.email.toLowerCase();

    // ---- Chế độ gửi email link đặt lại (không đổi mật khẩu, cán bộ tự đặt) ----
    if (sendEmail) {
      if (!authEmail) {
        throw new HttpError("Tài khoản này chưa có email đăng nhập — không thể gửi link đặt lại", 400);
      }
      const { error: mailError } = await adminClient.auth.resetPasswordForEmail(
        authEmail,
        { redirectTo: resetRedirect },
      );
      if (mailError) {
        throw new HttpError(`Không gửi được email đặt lại: ${mailError.message}`, 400);
      }
      await writeAuditLog(adminClient, {
        callerUserId: caller.userId,
        action: "reset_staff_password_email",
        entityId: profile.user_id,
        metadata: {
          target_user_id: profile.user_id,
          target_email: authEmail,
          profile_email: profile.email,
          email_mismatch: emailMismatch,
          profile_id: profile.id,
          mode: "email_link",
        },
      });
      return jsonResponse({
        success: true,
        mode: "email_link",
        profile_id: profile.id,
        email: authEmail,
        profile_email: profile.email,
        email_mismatch: emailMismatch,
        full_name: profile.full_name,
        message: "Đã gửi email link đặt lại mật khẩu cho cán bộ",
      });
    }

    // Merge metadata thay vì ghi đè để không mất các key khác (vd: full_name).

    const tempPassword = generatePassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      profile.user_id,
      {
        password: tempPassword,
        user_metadata: {
          ...existingUser.user.user_metadata,
          must_change_password: true,
        },
        // Cờ đặt ở CẢ app_metadata: user_metadata người dùng tự sửa được nên cán bộ
        // cầm mật khẩu tạm có thể tự gỡ yêu cầu đổi rồi dùng mãi. app_metadata chỉ
        // máy chủ ghi, và chỉ hàm doi-mat-khau hạ được — mà hàm đó chỉ hạ khi đã
        // thực sự đặt mật khẩu mới.
        app_metadata: {
          ...(existingUser.user.app_metadata ?? {}),
          must_change_password: true,
        },
      },
    );
    if (updateError) {
      throw new HttpError(`Không cấp lại được mật khẩu: ${updateError.message}`, 400);
    }

    await writeAuditLog(adminClient, {
      callerUserId: caller.userId,
      action: "reset_staff_password",
      entityId: profile.user_id,
      metadata: {
        target_user_id: profile.user_id,
        target_email: authEmail,
        profile_email: profile.email,
        email_mismatch: emailMismatch,
        profile_id: profile.id,
      },
    });

    return jsonResponse({
      success: true,
      mode: "temp_password",
      profile_id: profile.id,
      // Tên đăng nhập bàn giao = email Auth thật (không phải profiles.email).
      email: authEmail ?? profile.email,
      profile_email: profile.email,
      email_mismatch: emailMismatch,
      full_name: profile.full_name,
      temp_password: tempPassword,
      message: "Đã cấp lại mật khẩu tạm — bàn giao cho cán bộ và yêu cầu đổi ngay khi đăng nhập",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error("reset-staff-password error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Lỗi không xác định" },
      400,
    );
  }
});
