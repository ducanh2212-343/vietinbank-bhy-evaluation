import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type AppRole = 'employee' | 'manager' | 'pgd' | 'tcth_admin' | 'system_admin' | 'bgd';

export type AuthScope = 'self' | 'department' | 'block' | 'all';

interface AuthState {
  user: User | null;
  roles: AppRole[];
  profileId: string | null;
  departmentId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isPgd: boolean;
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
  isAdmin: false,
  isManager: false,
  isPgd: false,
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
  const [loading, setLoading] = useState(true);

  const fetchRolesAndProfile = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('id, department_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesRes.error) throw rolesRes.error;
    if (profileRes.error) throw profileRes.error;

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
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
    setProfileId(null);
    setDepartmentId(null);
    setVisibleDeptIds([]);
  };

  return (
    <AuthContext.Provider value={{
      user, roles, profileId, departmentId, loading,
      isAdmin, isManager, isPgd, scope, visibleDeptIds,
      canManageProfile, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
