// reset-staff-password — cấp lại mật khẩu tạm cho một cán bộ đã có tài khoản.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
// Trả mật khẩu tạm về màn hình admin đúng 1 lần; bật lại cờ must_change_password.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { STAFF_CREATOR_ROLES } from "../_shared/roles.ts";
import { generatePassword, writeAuditLog } from "../_shared/staff.ts";

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
