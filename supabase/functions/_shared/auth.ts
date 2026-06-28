import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.49.4";

/** Error carrying an HTTP status so handlers can return 401/403 correctly. */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

/** Service-role client — bypasses RLS. Never expose this key to the frontend. */
export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface CallerContext {
  userId: string;
  email: string | null;
  roles: string[];
  adminClient: SupabaseClient;
}

/**
 * Authenticate the caller from their JWT and verify they hold at least one of
 * the allowed roles. Throws HttpError(401/403) otherwise.
 */
export async function requireRole(
  req: Request,
  allowedRoles: readonly string[],
): Promise<CallerContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new HttpError("Thiếu thông tin xác thực", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Client bound to the caller's token — used only to resolve their identity.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) throw new HttpError("Phiên đăng nhập không hợp lệ", 401);

  const adminClient = getAdminClient();
  const { data: roleRows } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  const hasPermission = roles.some((r) => allowedRoles.includes(r));
  if (!hasPermission) {
    throw new HttpError("Bạn không có quyền tạo tài khoản cán bộ", 403);
  }

  return { userId: user.id, email: user.email ?? null, roles, adminClient };
}
