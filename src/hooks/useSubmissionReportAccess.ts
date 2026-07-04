import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Phạm vi xem "Báo cáo nộp biểu mẫu":
 * - Giám đốc/BGĐ (bgd), TCTH Admin (tcth_admin), System Admin (system_admin),
 *   lãnh đạo (trưởng phòng) Phòng Tổ chức Tổng hợp → toàn chi nhánh
 * - Phó giám đốc (pgd) → các phòng mình phụ trách
 *   (phòng của các cán bộ có pgd_id / director_id trỏ tới mình, cộng phòng của chính mình)
 * - vai trò khác → không truy cập
 */
export interface SubmissionReportAccess {
  loading: boolean;
  allowed: boolean;
  fullBranch: boolean;
  /** Chỉ có ý nghĩa khi !fullBranch: các phòng người xem được phép thấy */
  scopeDeptIds: string[];
}

export function useSubmissionReportAccess(): SubmissionReportAccess {
  const { roles, profileId, departmentId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fullBranch, setFullBranch] = useState(false);
  const [scopeDeptIds, setScopeDeptIds] = useState<string[]>([]);

  const isBgd = roles.includes('bgd');
  const isPgdRole = roles.includes('pgd');
  const rolesKey = roles.join(',');

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      // Lãnh đạo Phòng Tổ chức Tổng hợp (role manager, phòng TCTH) → toàn chi nhánh
      let tcthLeader = false;
      if (roles.includes('manager') && departmentId) {
        const { data } = await supabase.from('departments').select('name').eq('id', departmentId).maybeSingle();
        tcthLeader = !!data?.name && data.name.toLowerCase().includes('tổ chức');
      }
      const full = roles.includes('system_admin') || roles.includes('tcth_admin') || roles.includes('bgd') || tcthLeader;

      let deptIds: string[] = [];
      if (!full && roles.includes('pgd') && profileId) {
        const { data } = await supabase
          .from('profiles')
          .select('department_id')
          .or(`pgd_id.eq.${profileId},director_id.eq.${profileId}`)
          .not('department_id', 'is', null);
        const ids = new Set((data || []).map((r) => r.department_id as string));
        if (departmentId) ids.add(departmentId);
        deptIds = [...ids];
      }

      if (!cancelled) {
        setFullBranch(full);
        setScopeDeptIds(deptIds);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, rolesKey, profileId, departmentId]);

  return {
    loading: authLoading || loading,
    allowed: fullBranch || isBgd || isPgdRole,
    fullBranch,
    scopeDeptIds,
  };
}
