// delete-staff — permanently delete a staff member and ALL of their records.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
// Irreversible: profile, auth account, evaluations, plans, kanban, etc.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { STAFF_CREATOR_ROLES } from "../_shared/roles.ts";
import { writeAuditLog } from "../_shared/staff.ts";

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

    // Load the target so we can guard self-deletion and record what was removed.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, email, full_name, employee_code")
      .eq("id", profileId)
      .maybeSingle();
    if (profileError) throw new HttpError(`Lỗi tra cứu hồ sơ: ${profileError.message}`, 400);
    if (!profile) throw new HttpError("Không tìm thấy hồ sơ cán bộ", 404);

    if (profile.user_id && profile.user_id === caller.userId) {
      throw new HttpError("Không thể tự xóa tài khoản của chính mình", 400);
    }

    // 1) Delete the profile + all owned records atomically (returns the auth user id).
    const { data: userId, error: rpcError } = await adminClient.rpc("hard_delete_staff", {
      p_profile_id: profileId,
    });
    if (rpcError) {
      throw new HttpError(`Không xóa được dữ liệu cán bộ: ${rpcError.message}`, 400);
    }

    // 2) Delete the auth login account (best-effort — data is already gone).
    let authDeleted = false;
    if (userId) {
      const { error: authError } = await adminClient.auth.admin.deleteUser(userId as string);
      authDeleted = !authError;
      if (authError) {
        console.error("delete-staff: auth user delete failed", authError);
      }
    }

    await writeAuditLog(adminClient, {
      callerUserId: caller.userId,
      action: "hard_delete_staff",
      entityId: profileId,
      metadata: {
        profile_id: profileId,
        target_user_id: userId ?? null,
        target_email: profile.email,
        target_name: profile.full_name,
        employee_code: profile.employee_code,
        auth_deleted: authDeleted,
      },
    });

    return jsonResponse({
      success: true,
      profile_id: profileId,
      auth_deleted: authDeleted,
      message: "Đã xóa vĩnh viễn cán bộ và toàn bộ dữ liệu liên quan",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error("delete-staff error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Lỗi không xác định" },
      400,
    );
  }
});
