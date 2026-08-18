import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { chuanHoaManHinhKhach, type MaManHinhKhach } from '@/lib/manHinhKhach';

/** Ném khi tài khoản không còn hoạt động (nghỉ việc/tạm khóa) — chặn đăng nhập. */
class InactiveAccountError extends Error {
  constructor() {
    super('account_inactive');
    this.name = 'InactiveAccountError';
  }
}

type AppRole = 'employee' | 'manager' | 'pgd' | 'tcth_admin' | 'system_admin' | 'bgd' | 'guest';

export type AuthScope = 'self' | 'department' | 'block' | 'all';

interface AuthState {
  user: User | null;
  roles: AppRole[];
  profileId: string | null;
  departmentId: string | null;
  loading: boolean;
  /** True khi tài khoản đang dùng mật khẩu tạm và phải đổi trước khi dùng hệ thống */
  mustChangePassword: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isPgd: boolean;
  /** Khách đối tác (role guest) — chỉ được xem cổng BHY one */
  isGuest: boolean;
  /** Hạn truy cập của guest (ISO), null với cán bộ */
  guestExpiresAt: string | null;
  /** Màn hình cổng ONE mở cho guest này (rỗng với cán bộ) — xem src/lib/manHinhKhach.ts */
  guestScreens: MaManHinhKhach[];
  scope: AuthScope;
  /** dept ids the current user is allowed to see (empty array => no scope filter applied for admin; check `scope === 'all'` first) */
  visibleDeptIds: string[];
  /** True if user may manage (view+edit forms of) the given employee profile id */
  canManageProfile: (targetProfileId: string | null | undefined) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  roles: [],
  profileId: null,
  departmentId: null,
  loading: true,
  mustChangePassword: false,
  isAdmin: false,
  isManager: false,
  isPgd: false,
  isGuest: false,
  guestExpiresAt: null,
  guestScreens: [],
  scope: 'self',
  visibleDeptIds: [],
  canManageProfile: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [visibleDeptIds, setVisibleDeptIds] = useState<string[]>([]);
  const [guestExpiresAt, setGuestExpiresAt] = useState<string | null>(null);
  const [guestScreens, setGuestScreens] = useState<MaManHinhKhach[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRolesAndProfile = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('id, department_id, status').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesRes.error) throw rolesRes.error;
    if (profileRes.error) throw profileRes.error;

    // Khách đối tác: kiểm hạn truy cập trước (RLS là hàng rào thật, đây là lớp UX)
    const isGuestRole = (rolesRes.data ?? []).some((r) => r.role === 'guest');
    if (isGuestRole) {
      const { data: ga } = await supabase
        .from('guest_access')
        .select('expires_at, allowed_screens')
        .eq('user_id', userId)
        .maybeSingle();
      if (!ga || new Date(ga.expires_at) <= new Date()) {
        toast.error('Tài khoản khách đã hết hạn truy cập. Vui lòng liên hệ Chi nhánh để được gia hạn.');
        await supabase.auth.signOut();
        throw new InactiveAccountError();
      }
      setGuestExpiresAt(ga.expires_at);
      // Danh sách màn hình do Phòng TCTH chọn cho từng khách; chuẩn hóa để mã lạ
      // (màn hình đã gỡ) không lọt vào chốt chặn điều hướng
      setGuestScreens(chuanHoaManHinhKhach(ga.allowed_screens));
    } else {
      setGuestExpiresAt(null);
      setGuestScreens([]);
    }

    // Chặn truy cập của cán bộ đã bị chuyển "Nghỉ việc"/vô hiệu hóa (thu hồi quyền khi chấm dứt lao động).
    const status = (profileRes.data as { status?: string } | null)?.status;
    if (status && status !== 'active') {
      toast.error('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ bộ phận Tổ chức để được hỗ trợ.');
      await supabase.auth.signOut();
      throw new InactiveAccountError();
    }

    const nextRoles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
    const nextProfileId = profileRes.data?.id ?? null;
    const nextDeptId = profileRes.data?.department_id ?? null;

    setRoles(nextRoles);
    setProfileId(nextProfileId);
    setDepartmentId(nextDeptId);

    // Compute visible dept ids based on role
    const isAdmin = nextRoles.some((r) => ['bgd', 'tcth_admin', 'system_admin'].includes(r));
    if (isAdmin) {
      setVisibleDeptIds([]); // means "all" — pages should check scope first
    } else if (nextRoles.includes('pgd') && nextProfileId) {
      const { data } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('pgd_id', nextProfileId)
        .not('department_id', 'is', null);
      const ids = Array.from(new Set((data ?? []).map((r) => r.department_id as string)));
      if (nextDeptId && !ids.includes(nextDeptId)) ids.push(nextDeptId);
      setVisibleDeptIds(ids);
    } else if (nextRoles.includes('manager') && nextDeptId) {
      setVisibleDeptIds([nextDeptId]);
    } else {
      setVisibleDeptIds(nextDeptId ? [nextDeptId] : []);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const applyAuthState = async (nextUser: User | null) => {
      if (!isMounted) return;

      setUser(nextUser);

      if (!nextUser) {
        setRoles([]);
        setProfileId(null);
        setDepartmentId(null);
        setVisibleDeptIds([]);
        if (isMounted) setLoading(false);
        return;
      }

      try {
        await fetchRolesAndProfile(nextUser.id);
      } catch (error) {
        console.error('fetchRolesAndProfile error:', error);
        if (!isMounted) return;
        // Tài khoản bị vô hiệu hóa: đã signOut bên trong — xóa luôn user để chuyển về trang đăng nhập ngay.
        if (error instanceof InactiveAccountError) setUser(null);
        setRoles([]);
        setProfileId(null);
        setDepartmentId(null);
        setVisibleDeptIds([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Stale/invalid refresh token — purge local session so user lands on a clean login.
          const msg = (error as any)?.message || '';
          const code = (error as any)?.code || '';
          if (code === 'refresh_token_not_found' || /Refresh Token/i.test(msg)) {
            try { await supabase.auth.signOut(); } catch { /* noop */ }
            if (!isMounted) return;
            setUser(null);
            setRoles([]);
            setProfileId(null);
            setDepartmentId(null);
            setVisibleDeptIds([]);
            setLoading(false);
            return;
          }
          throw error;
        }
        await applyAuthState(session?.user ?? null);
      } catch (error) {
        console.error('getSession error:', error);
        if (!isMounted) return;
        setUser(null);
        setRoles([]);
        setProfileId(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Người dùng vào bằng link đặt-lại-mật-khẩu trong email. Nếu Auth trả họ về
        // trang chủ (redirect_to thiếu / không nằm trong allow-list) thì ép về đúng
        // trang đặt mật khẩu mới — không để họ lạc vào app mà không đổi mật khẩu.
        if (window.location.pathname !== '/dat-lai-mat-khau') {
          window.location.replace('/dat-lai-mat-khau');
          return;
        }
      }
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Refresh failed — ensure we don't keep a stale user object.
        void supabase.auth.signOut().catch(() => {});
        void applyAuthState(null);
        return;
      }
      void applyAuthState(session?.user ?? null);
    });

    void initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.some((r) => ['bgd', 'tcth_admin', 'system_admin'].includes(r));
  const isPgd = roles.includes('pgd');
  const isManager = roles.includes('manager');
  const isGuest = roles.includes('guest');

  // Cờ được gắn khi admin cấp tài khoản/mật khẩu tạm; xóa sau khi đổi mật khẩu thành công.
  const mcp = user?.user_metadata?.must_change_password;
  const mustChangePassword = mcp === true || mcp === 'true';

  const scope: AuthScope = isAdmin ? 'all' : isPgd ? 'block' : isManager ? 'department' : 'self';

  const canManageProfile = useMemo(() => {
    return (targetProfileId: string | null | undefined) => {
      if (!targetProfileId) return false;
      if (isAdmin) return true;
      if (targetProfileId === profileId) return true;
      // For department/block scope, caller still needs the target's department.
      // Component-level check happens after loading the profile.
      return false;
    };
  }, [isAdmin, profileId]);

  const signOut = async () => {
    // Xóa mốc "hoạt động cuối" để lần đăng nhập sau không bị guard idle đăng xuất oan
    try { localStorage.removeItem('343skill:last-activity'); } catch { /* noop */ }
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
    setProfileId(null);
    setDepartmentId(null);
    setVisibleDeptIds([]);
    setGuestExpiresAt(null);
    setGuestScreens([]);
  };

  return (
    <AuthContext.Provider value={{
      user, roles, profileId, departmentId, loading, mustChangePassword,
      isAdmin, isManager, isPgd, isGuest, guestExpiresAt, guestScreens, scope, visibleDeptIds,
      canManageProfile, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
