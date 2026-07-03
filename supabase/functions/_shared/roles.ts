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
