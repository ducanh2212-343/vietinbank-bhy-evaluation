// update-staff-email — đổi email ĐĂNG NHẬP của một cán bộ, đồng bộ Auth + hồ sơ.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
//
// Lý do tồn tại: frontend chỉ có quyền sửa profiles.email (RLS), KHÔNG sửa được
// auth.users.email (cần Admin API). Nếu chỉ sửa hồ sơ, hai email lệch nhau →
// admin bàn giao mật khẩu kèm tên đăng nhập sai, cán bộ không đăng nhập được.
// Function này là đường duy nhất để đổi email: cập nhật auth.users trước
// (email_confirm để không bắt xác nhận lại), rồi đồng bộ profiles.email.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { STAFF_CREATOR_ROLES, isElevatedRole } from "../_shared/roles.ts";
import { EMAIL_RE, searchAuthByEmail, writeAuditLog } from "../_shared/staff.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireRole(req, STAFF_CREATOR_ROLES);
    const adminClient = caller.adminClient;

    const body = await req.json().catch(() => ({}));
    const profileId = typeof body?.profile_id === "string" ? body.profile_id : null;
    const newEmail = typeof body?.new_email === "string"
      ? body.new_email.trim().toLowerCase()
      : null;
    if (!profileId) throw new HttpError("Thiếu profile_id", 400);
    if (!newEmail) throw new HttpError("Thiếu email mới", 400);
    if (!EMAIL_RE.test(newEmail)) throw new HttpError("Email không hợp lệ", 400);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, email, full_name")
      .eq("id", profileId)
      .maybeSingle();
    if (profileError) throw new HttpError(`Lỗi tra cứu hồ sơ: ${profileError.message}`, 400);
    if (!profile) throw new HttpError("Không tìm thấy hồ sơ cán bộ", 404);

    // Không cho tự đổi email đăng nhập của chính mình qua đường admin
    // (tránh tự khóa phiên; nhờ một quản trị viên khác thao tác).
    if (profile.user_id && profile.user_id === caller.userId) {
      throw new HttpError("Không thể tự đổi email đăng nhập của chính mình — nhờ quản trị viên khác thao tác", 400);
    }

    // Chống leo thang: tcth_admin không được đụng tài khoản đang giữ vai trò quản trị.
    if (profile.user_id && !caller.roles.includes("system_admin")) {
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      if (isElevatedRole((roleRow as { role: string } | null)?.role ?? null)) {
        throw new HttpError(
          "Tài khoản này đang giữ vai trò quản trị — chỉ Quản trị hệ thống mới được chỉnh sửa.",
          403,
        );
      }
    }

    // Email mới không được trùng hồ sơ khác hoặc tài khoản Auth khác.
    const { data: dupProfile } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("email", newEmail)
      .neq("id", profile.id)
      .maybeSingle();
    if (dupProfile) {
      throw new HttpError(
        `Email này đã thuộc hồ sơ của "${(dupProfile as { full_name: string }).full_name}"`,
        409,
      );
    }
    const dupAuthId = await searchAuthByEmail(adminClient, newEmail);
    if (dupAuthId && dupAuthId !== profile.user_id) {
      throw new HttpError("Email này đã được dùng cho một tài khoản đăng nhập khác", 409);
    }

    // ---- Đổi email Auth trước (nếu cán bộ đã có tài khoản), rồi đồng bộ hồ sơ ----
    let oldAuthEmail: string | null = null;
    if (profile.user_id) {
      const { data: existingUser, error: getUserError } = await adminClient.auth.admin
        .getUserById(profile.user_id);
      if (getUserError || !existingUser?.user) {
        throw new HttpError("Không tìm thấy tài khoản đăng nhập của cán bộ này", 404);
      }
      oldAuthEmail = existingUser.user.email ?? null;

      if ((oldAuthEmail ?? "").toLowerCase() !== newEmail) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          profile.user_id,
          { email: newEmail, email_confirm: true },
        );
        if (updateError) {
          throw new HttpError(`Không đổi được email đăng nhập: ${updateError.message}`, 400);
        }
      }
    }

    const { error: profUpdateError } = await adminClient
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", profile.id);
    if (profUpdateError) {
      // Auth đã đổi mà hồ sơ chưa — báo rõ để admin lưu lại lần nữa (idempotent).
      throw new HttpError(
        `Đã đổi email đăng nhập nhưng chưa đồng bộ được hồ sơ: ${profUpdateError.message}. Vui lòng lưu lại lần nữa.`,
        500,
      );
    }

    await writeAuditLog(adminClient, {
      callerUserId: caller.userId,
      action: "update_staff_email",
      entityId: profile.user_id ?? profile.id,
      metadata: {
        target_user_id: profile.user_id,
        profile_id: profile.id,
        old_auth_email: oldAuthEmail,
        old_profile_email: profile.email,
        new_email: newEmail,
      },
    });

    return jsonResponse({
      success: true,
      profile_id: profile.id,
      user_id: profile.user_id,
      old_email: oldAuthEmail ?? profile.email,
      new_email: newEmail,
      full_name: profile.full_name,
      message: profile.user_id
        ? "Đã đổi email đăng nhập và đồng bộ hồ sơ"
        : "Đã cập nhật email hồ sơ (cán bộ chưa có tài khoản đăng nhập)",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error("update-staff-email error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Lỗi không xác định" },
      400,
    );
  }
});
