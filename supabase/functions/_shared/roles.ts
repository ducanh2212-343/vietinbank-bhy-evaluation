// Valid application roles (mirrors public.app_role enum).
export const VALID_ROLES = [
  "employee",
  "manager",
  "pgd",
  "tcth_admin",
  "system_admin",
  "bgd",
] as const;

export type AppRole = (typeof VALID_ROLES)[number];

export function isValidRole(role: string | null | undefined): role is AppRole {
  return !!role && (VALID_ROLES as readonly string[]).includes(role);
}

// Human-friendly Vietnamese labels for business users.
export const ROLE_LABELS: Record<AppRole, string> = {
  employee: "Cán bộ",
  manager: "Trưởng phòng/Trưởng đơn vị",
  pgd: "PGĐ phụ trách",
  tcth_admin: "TCTH/Admin",
  bgd: "Ban Giám đốc",
  system_admin: "Quản trị hệ thống",
};

// Roles permitted to create/reset staff accounts. system_admin + TCTH.
// Both already pass the frontend AdminRoute guard, so no UI change is needed.
export const STAFF_CREATOR_ROLES: AppRole[] = ["system_admin", "tcth_admin"];

// Roles permitted to PERMANENTLY delete a staff member (hard delete, irreversible).
// Restricted to system_admin only — tcth_admin can create/reset but not wipe data.
export const STAFF_DELETER_ROLES: AppRole[] = ["system_admin"];

// Administrative roles. Assigning any of these grants elevated access, so only a
// system_admin may hand them out (a tcth_admin must not be able to mint another
// admin or promote themselves). Non-elevated roles (employee/manager/pgd) may be
// assigned by any STAFF_CREATOR_ROLES holder.
export const ELEVATED_ROLES: AppRole[] = ["tcth_admin", "system_admin", "bgd"];

export function isElevatedRole(role: string | null | undefined): boolean {
  return !!role && (ELEVATED_ROLES as readonly string[]).includes(role);
}

/**
 * Can a caller holding `callerRoles` assign `targetRole` to an account?
 * - system_admin: may assign any role.
 * - anyone else (i.e. tcth_admin): only non-elevated roles.
 */
export function canAssignRole(
  callerRoles: readonly string[],
  targetRole: string,
): boolean {
  if (callerRoles.includes("system_admin")) return true;
  return !isElevatedRole(targetRole);
}
