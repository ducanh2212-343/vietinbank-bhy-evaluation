import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ObservableProfile {
  id: string;
  full_name: string;
  employee_code: string | null;
  department_id: string | null;
  department_name: string | null;
  position_title: string | null;
}

/**
 * Quyền Nếp Tốt của người dùng hiện tại.
 * - canRecord: được Ghi nhanh (TP/PP qua role manager, PGĐ, Giám đốc/BGĐ).
 *   tcth_admin/system_admin thuần không ghi nhận nghiệp vụ — khớp RLS.
 * - staff: danh sách cán bộ trong phạm vi ghi nhận (RPC get_observable_profiles,
 *   server tự lọc theo can_observe_profile — UI không tự suy phạm vi).
 */
export function useNepTotAccess() {
  const { roles, profileId, loading: authLoading } = useAuth();
  const canRecord = roles.some((r) => r === 'manager' || r === 'pgd' || r === 'bgd');

  const [staff, setStaff] = useState<ObservableProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!canRecord || staffLoading) return;
    setStaffLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_observable_profiles');
      if (error) throw error;
      setStaff((data ?? []) as ObservableProfile[]);
      setStaffLoaded(true);
    } catch (e) {
      console.error('get_observable_profiles error:', e);
    } finally {
      setStaffLoading(false);
    }
  }, [canRecord, staffLoading]);

  // Nạp sẵn khi có quyền — danh sách nhỏ (trong phạm vi quản lý), dùng cho FAB
  useEffect(() => {
    if (!authLoading && canRecord && !staffLoaded && !staffLoading) void loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canRecord, staffLoaded]);

  return { canRecord, profileId, staff, staffLoading, staffLoaded, reloadStaff: loadStaff };
}
