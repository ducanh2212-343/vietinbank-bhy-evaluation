import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Quyền truy cập nhóm tính năng quản trị năng lực chiến lược
 * (Bản đồ rủi ro năng lực, Con đường sự nghiệp, Mô phỏng điều chuyển):
 * - Giám đốc/BGĐ (bgd), TCTH Admin (tcth_admin), System Admin (system_admin)
 * - Lãnh đạo (trưởng phòng) Phòng Tổ chức Tổng hợp
 * - Vai trò khác → không truy cập (dữ liệu là toàn chi nhánh)
 * Cùng quy tắc với RLS phía server (is_tcth_leader + admin roles).
 */
export interface StrategicHrAccess {
  loading: boolean;
  allowed: boolean;
}

export function useStrategicHrAccess(): StrategicHrAccess {
  const { roles, departmentId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const rolesKey = roles.join(',');

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const isAdminRole = roles.some((r) => ['system_admin', 'tcth_admin', 'bgd'].includes(r));
      let tcthLeader = false;
      if (!isAdminRole && roles.includes('manager') && departmentId) {
        const { data } = await supabase.from('departments').select('name').eq('id', departmentId).maybeSingle();
        tcthLeader = !!data?.name && data.name.toLowerCase().includes('tổ chức');
      }
      if (!cancelled) {
        setAllowed(isAdminRole || tcthLeader);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, rolesKey, departmentId]);

  return { loading: authLoading || loading, allowed };
}
