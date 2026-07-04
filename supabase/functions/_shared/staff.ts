import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isValidRole } from "./roles.ts";

/** Validation error for a single staff row — never aborts a bulk run. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface StaffInput {
  employee_code?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  role?: string | null;
  // Direct profile ids (single-create form). Bulk resolves emails into these.
  manager_id?: string | null;
  pgd_id?: string | null;
  director_id?: string | null;
  status?: string | null;
  note?: string | null;
  send_password_email?: boolean;
}

export interface StaffContext {
  adminClient: SupabaseClient;
  callerUserId: string;
  siteUrl: string;
  // Optional pre-loaded validation sets (bulk loads these once).
  validDeptIds?: Set<string>;
  validPositionIds?: Set<string>;
  positionNames?: Map<string, string>;
  /** position_id -> department_id (kiểm tra vị trí thuộc đúng phòng ban) */
  positionDepartments?: Map<string, string | null>;
}

export interface StaffResult {
  success: true;
  user_id: string;
  profile_id: string;
  created_new: boolean;
  role_assigned: string;
  email_sent: boolean;
  temp_password: string | null;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cryptographically strong temporary password (mixed case + digits + symbol). */
export function generatePassword(length = 16): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function clean(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

/** Locate an existing auth user id by email — profiles first, then auth list. */
async function findExistingUserId(
  adminClient: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data: prof } = await adminClient
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();
  if (prof?.user_id) return prof.user_id as string;
  return null;
}

/** Page through auth.users to locate an email (used only on create conflict). */
async function searchAuthByEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data) return null;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

/**
 * Create (or reuse) an Auth user, upsert their profile and role, and write an
 * audit log. Idempotent on email: an existing auth user is reused, an existing
 * profile (matched by user_id or email) is updated rather than duplicated.
 */
export async function createOrUpdateStaffUser(
  input: StaffInput,
  ctx: StaffContext,
): Promise<StaffResult> {
  const { adminClient, callerUserId, siteUrl } = ctx;

  // ---- Validate ----------------------------------------------------------
  const email = clean(input.email)?.toLowerCase() ?? null;
  const fullName = clean(input.full_name);
  const employeeCode = clean(input.employee_code);
  const role = clean(input.role) ?? "employee";

  if (!email) throw new ValidationError("Thiếu email đăng nhập");
  if (!EMAIL_RE.test(email)) throw new ValidationError("Email không hợp lệ");
  if (!fullName) throw new ValidationError("Thiếu họ tên");
  // employee_code (mã cán bộ) là tùy chọn — đã ẩn khỏi giao diện; giữ cột để
  // dữ liệu cũ và import Excel vẫn dùng được nếu có.
  if (!isValidRole(role)) throw new ValidationError(`Vai trò không hợp lệ: ${role}`);

  const departmentId = clean(input.department_id);
  const positionId = clean(input.position_id);

  // Phòng ban + vị trí là BẮT BUỘC — hồ sơ thiếu vị trí sẽ không tự đánh giá được.
  if (!departmentId) throw new ValidationError("Vui lòng chọn phòng ban (thiếu department_id)");
  if (!positionId) throw new ValidationError("Vui lòng chọn chức vụ/vị trí (thiếu position_id)");

  // Kiểm tra phòng ban tồn tại (dùng set preload của bulk nếu có, không thì query trực tiếp)
  if (ctx.validDeptIds) {
    if (!ctx.validDeptIds.has(departmentId)) {
      throw new ValidationError("Không tìm thấy phòng ban (department_id)");
    }
  } else {
    const { data: dept } = await adminClient
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .maybeSingle();
    if (!dept) throw new ValidationError("Không tìm thấy phòng ban (department_id)");
  }

  // Kiểm tra vị trí tồn tại + thuộc đúng phòng ban, đồng thời resolve tên vị trí
  // (làm TRƯỚC khi tạo Auth user để không tạo tài khoản mồ côi khi dữ liệu sai).
  let positionName: string | null = null;
  let positionDeptId: string | null = null;
  if (ctx.validPositionIds && ctx.positionNames && ctx.positionDepartments) {
    if (!ctx.validPositionIds.has(positionId)) {
      throw new ValidationError("Không tìm thấy vị trí (position_id)");
    }
    positionName = ctx.positionNames.get(positionId) ?? null;
    positionDeptId = ctx.positionDepartments.get(positionId) ?? null;
  } else {
    const { data: posData } = await adminClient
      .from("positions")
      .select("name, department_id")
      .eq("id", positionId)
      .maybeSingle();
    if (!posData) throw new ValidationError("Không tìm thấy vị trí (position_id)");
    positionName = (posData as { name: string | null }).name ?? null;
    positionDeptId = (posData as { department_id: string | null }).department_id ?? null;
  }
  if (positionDeptId && positionDeptId !== departmentId) {
    throw new ValidationError("Vị trí không thuộc phòng ban đã chọn");
  }
  if (!positionName) {
    throw new ValidationError("Vị trí chưa có tên hiển thị — vui lòng kiểm tra danh mục vị trí");
  }

  // ---- Resolve / create the Auth user ------------------------------------
  let userId = await findExistingUserId(adminClient, email);
  let createdNew = false;
  let tempPassword: string | null = null;

  if (!userId) {
    tempPassword = generatePassword();
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, must_change_password: true },
    });
    if (error) {
      // Auth user may already exist without a profile row — recover its id.
      if (/registered|already|exists/i.test(error.message)) {
        userId = await searchAuthByEmail(adminClient, email);
        tempPassword = null;
        if (!userId) {
          throw new ValidationError(`Không tạo được tài khoản: ${error.message}`);
        }
      } else {
        throw new ValidationError(`Không tạo được tài khoản: ${error.message}`);
      }
    } else {
      userId = data.user.id;
      createdNew = true;
    }
  }

  // ---- Upsert the profile (match by user_id, then by email) --------------
  let existingProfile:
    | { id: string; user_id: string | null }
    | null = null;
  {
    const { data } = await adminClient
      .from("profiles")
      .select("id, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    existingProfile = data as typeof existingProfile;
  }
  if (!existingProfile) {
    const { data } = await adminClient
      .from("profiles")
      .select("id, user_id")
      .eq("email", email)
      .maybeSingle();
    existingProfile = data as typeof existingProfile;
  }

  const profileFields = {
    user_id: userId,
    employee_code: employeeCode,
    full_name: fullName,
    email,
    phone: clean(input.phone),
    department_id: departmentId,
    position_id: positionId,
    position: positionName,
    manager_id: clean(input.manager_id),
    pgd_id: clean(input.pgd_id),
    director_id: clean(input.director_id),
    status: clean(input.status) ?? "active",
    note: clean(input.note),
  };

  let profileId: string;
  if (existingProfile) {
    const { data, error } = await adminClient
      .from("profiles")
      .update(profileFields)
      .eq("id", existingProfile.id)
      .select("id")
      .single();
    if (error) throw new ValidationError(`Lỗi cập nhật hồ sơ: ${error.message}`);
    profileId = data.id;
  } else {
    const { data, error } = await adminClient
      .from("profiles")
      .insert(profileFields)
      .select("id")
      .single();
    if (error) throw new ValidationError(`Lỗi tạo hồ sơ: ${error.message}`);
    profileId = data.id;
  }

  // ---- Assign role (one role per user — upsert on user_id) ---------------
  // user_roles has a UNIQUE(user_id) constraint, so a plain insert fails when
  // the account already holds a role. Upsert updates the existing role instead.
  const { error: roleError } = await adminClient
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (roleError) {
    throw new ValidationError(`Lỗi gán vai trò: ${roleError.message}`);
  }

  // ---- Optional password-reset email -------------------------------------
  let emailSent = false;
  if (input.send_password_email) {
    try {
      // Link email khôi phục phải trỏ về trang đặt-lại-mật-khẩu (không hỏi mật
      // khẩu cũ) — cán bộ mới chưa có mật khẩu hiện tại để nhập.
      const { error: mailError } = await adminClient.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${siteUrl}/dat-lai-mat-khau` },
      );
      emailSent = !mailError;
    } catch (_e) {
      emailSent = false;
    }
  }

  return {
    success: true,
    user_id: userId!,
    profile_id: profileId,
    created_new: createdNew,
    role_assigned: role,
    email_sent: emailSent,
    temp_password: createdNew && !emailSent ? tempPassword : null,
    message: createdNew
      ? "Đã tạo tài khoản mới"
      : "Tài khoản đã tồn tại — đã cập nhật hồ sơ",
  };
}

/** Write an audit log entry. Best-effort: failures are swallowed. */
export async function writeAuditLog(
  adminClient: SupabaseClient,
  params: {
    callerUserId: string;
    action: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await adminClient.from("audit_logs").insert({
      user_id: params.callerUserId,
      action: params.action,
      entity_type: "staff_account",
      entity_id: params.entityId,
      new_data: params.metadata,
    });
  } catch (e) {
    console.error("audit_logs insert failed:", e);
  }
}

/** Resolve the public site URL for password-reset redirects. */
export function resolveSiteUrl(req: Request): string {
  const fromEnv = Deno.env.get("SITE_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  return "https://343skill.com";
}
