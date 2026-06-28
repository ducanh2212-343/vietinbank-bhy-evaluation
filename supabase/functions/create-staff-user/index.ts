// create-staff-user — create a single staff Auth account + profile + role.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireRole } from "../_shared/auth.ts";
import { STAFF_CREATOR_ROLES } from "../_shared/roles.ts";
import {
  createOrUpdateStaffUser,
  resolveSiteUrl,
  type StaffInput,
  ValidationError,
  writeAuditLog,
} from "../_shared/staff.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireRole(req, STAFF_CREATOR_ROLES);
    const body = (await req.json()) as StaffInput;

    const result = await createOrUpdateStaffUser(body, {
      adminClient: caller.adminClient,
      callerUserId: caller.userId,
      siteUrl: resolveSiteUrl(req),
    });

    await writeAuditLog(caller.adminClient, {
      callerUserId: caller.userId,
      action: "create_staff_user",
      entityId: result.user_id,
      metadata: {
        target_user_id: result.user_id,
        target_email: body.email,
        employee_code: body.employee_code,
        role: result.role_assigned,
        created_new: result.created_new,
        email_sent: result.email_sent,
      },
    });

    return jsonResponse(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    if (error instanceof ValidationError) {
      return jsonResponse({ error: error.message }, 400);
    }
    console.error("create-staff-user error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Lỗi không xác định" },
      400,
    );
  }
});
