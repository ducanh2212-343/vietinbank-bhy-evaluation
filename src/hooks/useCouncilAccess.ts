import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CouncilMemberGroup } from '@/lib/council';

/**
 * Quyền truy cập tính năng Đánh giá đầu mối của Hội đồng:
 * - isMember    : có tên trong bảng council_members (đang hoạt động) → được chấm điểm
 * - isSubject   : là cán bộ đầu mối được đánh giá ở ít nhất một kỳ → xem báo cáo của mình
 * - isSupervisor: là PGĐ phụ trách ≥1 đầu mối (supervisor_pgd_id) → xem báo cáo đầu mối mình phụ trách.
 *   Tín hiệu này độc lập với vai trò (role), nên vẫn đúng sau khi PGĐ bị hạ khỏi quyền admin (bgd→pgd).
 * - Admin (bgd/tcth_admin/system_admin) hoặc Giám đốc luôn xem được báo cáo và trang quản trị.
 */
export interface CouncilAccess {
  loading: boolean;
  isMember: boolean;
  isSubject: boolean;
  isSupervisor: boolean;
  memberGroup: CouncilMemberGroup | null;
}

export function useCouncilAccess(): CouncilAccess {
  const { profileId, loading: authLoading } = useAuth();
  const [state, setState] = useState<Omit<CouncilAccess, 'loading'>>({
    isMember: false,
    isSubject: false,
    isSupervisor: false,
    memberGroup: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!profileId) {
      setState({ isMember: false, isSubject: false, isSupervisor: false, memberGroup: null });
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [memberRes, subjectRes, supervisorRes] = await Promise.all([
        supabase
          .from('council_members')
          .select('member_group, is_active')
          .eq('profile_id', profileId)
          .maybeSingle(),
        supabase
          .from('council_subjects')
          .select('id')
          .eq('profile_id', profileId)
          .limit(1),
        supabase
          .from('council_subjects')
          .select('id')
          .eq('supervisor_pgd_id', profileId)
          .limit(1),
      ]);
      if (cancelled) return;
      const member = memberRes.data;
      setState({
        isMember: !!member?.is_active,
        isSubject: (subjectRes.data || []).length > 0,
        isSupervisor: (supervisorRes.data || []).length > 0,
        memberGroup: member?.is_active ? (member.member_group as CouncilMemberGroup) : null,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, profileId]);

  return { loading: authLoading || loading, ...state };
}
