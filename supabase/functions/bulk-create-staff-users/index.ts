// bulk-create-staff-users — create many staff accounts from validated rows.
// Caller must be authenticated and hold a STAFF_CREATOR_ROLES role.
// One failing row never aborts the batch; every row gets an individual result.
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

const MAX_ROWS = 200;

interface BulkRow extends StaffInput {
  row_number?: number;
  manager_email?: string | null;
  pgd_email?: string | null;
  director_email?: string | null;
}

interface RowResult {
  row_number: number;
  employee_code: string | null;
  email: string | null;
  status: "created" | "updated" | "error";
  message: string;
  user_id?: string;
  profile_id?: string;
  temp_password?: string | null;
}

function norm(email: string | null | undefined): string | null {
  const t = (email ?? "").trim().toLowerCase();
  return t === "" ? null : t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireRole(req, STAFF_CREATOR_ROLES);
    const adminClient = caller.adminClient;
    const siteUrl = resolveSiteUrl(req);

    const body = await req.json();
    const rows: BulkRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const options = body?.options ?? {};
    const forceSendEmail = options.send_password_email === true;

    if (rows.length === 0) {
      throw new HttpError("Danh sách trống", 400);
    }
    if (rows.length > MAX_ROWS) {
      throw new HttpError(`Tối đa ${MAX_ROWS} dòng mỗi lần`, 400);
    }

    // Pre-load reference data once for validation + lookups.
    const [deptRes, posRes, profRes] = await Promise.all([
      adminClient.from("departments").select("id"),
      adminClient.from("positions").select("id, name, department_id"),
      adminClient.from("profiles").select("id, email"),
    ]);

    const validDeptIds = new Set((deptRes.data ?? []).map((d: { id: string }) => d.id));
    const validPositionIds = new Set(
      (posRes.data ?? []).map((p: { id: string }) => p.id),
    );
    const positionNames = new Map(
      (posRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
    );
    const positionDepartments = new Map(
      (posRes.data ?? []).map(
        (p: { id: string; department_id: string | null }) => [p.id, p.department_id ?? null],
      ),
    );
    const profileByEmail = new Map<string, string>();
    for (const p of (profRes.data ?? []) as { id: string; email: string | null }[]) {
      const e = norm(p.email);
      if (e) profileByEmail.set(e, p.id);
    }

    const results: RowResult[] = [];
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = row.row_number ?? i + 1;
      try {
        // Resolve reporting-line emails into profile ids (warn-only if missing).
        const managerEmail = norm(row.manager_email);
        const pgdEmail = norm(row.pgd_email);
        const directorEmail = norm(row.director_email);

        const input: StaffInput = {
          employee_code: row.employee_code,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
          department_id: row.department_id,
          position_id: row.position_id,
          role: row.role,
          manager_id: managerEmail ? profileByEmail.get(managerEmail) ?? null : null,
          pgd_id: pgdEmail ? profileByEmail.get(pgdEmail) ?? null : null,
          director_id: directorEmail
            ? profileByEmail.get(directorEmail) ?? null
            : null,
          status: row.status,
          note: row.note,
          send_password_email: forceSendEmail || row.send_password_email === true,
        };

        const result = await createOrUpdateStaffUser(input, {
          adminClient,
          callerUserId: caller.userId,
          callerRoles: caller.roles,
          siteUrl,
          validDeptIds,
          validPositionIds,
          positionNames,
          positionDepartments,
        });

        if (result.created_new) created++;
        else updated++;

        results.push({
          row_number: rowNumber,
          employee_code: row.employee_code ?? null,
          email: row.email ?? null,
          status: result.created_new ? "created" : "updated",
          message: result.message,
          user_id: result.user_id,
          profile_id: result.profile_id,
          temp_password: result.temp_password,
        });
      } catch (rowError) {
        errors++;
        const message = rowError instanceof Error
          ? rowError.message
          : "Lỗi không xác định";
        results.push({
          row_number: rowNumber,
          employee_code: row.employee_code ?? null,
          email: row.email ?? null,
          status: "error",
          message,
        });
      }
    }

    await writeAuditLog(adminClient, {
      callerUserId: caller.userId,
      action: "bulk_create_staff_users",
      entityId: null,
      metadata: {
        total: rows.length,
        created,
        updated,
        errors,
      },
    });

    return jsonResponse({
      success: true,
      total: rows.length,
      created,
      updated,
      errors,
      results,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    if (error instanceof ValidationError) {
      return jsonResponse({ error: error.message }, 400);
    }
    console.error("bulk-create-staff-users error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Lỗi không xác định" },
      400,
    );
  }
});
