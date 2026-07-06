// reset-staff-password — cấp lại mật khẩu cho một cán bộ đã có tài khoản.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
// Hai chế độ:
//   • Mặc định: sinh mật khẩu tạm, trả về màn hình admin 1 lần để bàn giao (Zalo/SMS),
//     bật cờ must_change_password → cán bộ đổi ngay lần đăng nhập kế tiếp.
//   • send_email=true: KHÔNG đổi mật khẩu, gửi email link đặt lại cho cán bộ (qua Resend);
//     cán bộ bấm link là vào thẳng trang đặt mật khẩu mới. Admin không thấy mật khẩu.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { STAFF_CREATOR_ROLES } from "../_shared/roles.ts";
import { generatePassword, writeAuditLog } from "../_shared/staff.ts";

// Chỉ chấp nhận redirect https tới đúng trang đặt lại mật khẩu (chống open-redirect).
// Allow-list của Supabase Auth là chốt chặn cuối; đây là lớp phòng vệ thêm.
function safeResetRedirect(input: unknown): string {
  const fallback = "https://343skill.com/dat-lai-mat-khau";
  if (typeof input !== "string") return fallback;
  try {
    const u = new URL(input);
    if (u.protocol === "https:" && u.pathname === "/dat-lai-mat-khau") return input;
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

    // ---- Chế độ gửi email link đặt lại (không đổi mật khẩu, cán bộ tự đặt) ----
    if (sendEmail) {
      if (!profile.email) {
        throw new HttpError("Cán bộ này chưa có email — không thể gửi link đặt lại", 400);
      }
      const { error: mailError } = await adminClient.auth.resetPasswordForEmail(
        profile.email,
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
          target_email: profile.email,
          profile_id: profile.id,
          mode: "email_link",
        },
      });
      return jsonResponse({
        success: true,
        mode: "email_link",
        profile_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        message: "Đã gửi email link đặt lại mật khẩu cho cán bộ",
      });
    }

    // Merge metadata thay vì ghi đè để không mất các key khác (vd: full_name).
    const { data: existingUser, error: getUserError } = await adminClient.auth.admin
      .getUserById(profile.user_id);
    if (getUserError || !existingUser?.user) {
      throw new HttpError("Không tìm thấy tài khoản đăng nhập của cán bộ này", 404);
    }

    const tempPassword = generatePassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      profile.user_id,
      {
        password: tempPassword,
        user_metadata: {
          ...existingUser.user.user_metadata,
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
        target_email: profile.email,
        profile_id: profile.id,
      },
    });

    return jsonResponse({
      success: true,
      mode: "temp_password",
      profile_id: profile.id,
      email: profile.email,
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
