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
  const roleCanRecord = roles.some((r) => r === 'manager' || r === 'pgd' || r === 'bgd');
  const isBranchAdmin = roles.some((r) => r === 'tcth_admin' || r === 'system_admin');

  // Giám đốc chi nhánh dùng tài khoản admin (hệ thống chỉ cho 1 role/user nên
  // không gán thêm được 'bgd'): nhận diện theo CHỨC DANH hồ sơ — khớp hàm
  // is_branch_director() phía RLS (migration 20260803090000)
  const [isDirectorByPosition, setIsDirectorByPosition] = useState(false);
  useEffect(() => {
    if (roleCanRecord || !isBranchAdmin || !profileId) return;
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('position')
      .eq('id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsDirectorByPosition(
            (data?.position ?? '').toLowerCase().startsWith('giám đốc'),
          );
        }
      });
    return () => { cancelled = true; };
  }, [roleCanRecord, isBranchAdmin, profileId]);

  const canRecord = roleCanRecord || isDirectorByPosition;
  // Admin chi nhánh (TCTH/System) thuần đọc được nhật ký (bản đã xác nhận,
  // loại 'quan_ly' — RLS quyết định), nhưng không ghi nhận nghiệp vụ
  const canViewJournal = canRecord || isBranchAdmin;

  const [staff, setStaff] = useState<ObservableProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);
  // Lỗi khi gọi RPC (VD: database chưa áp migration Nếp Tốt) — UI phải phân
  // biệt với trường hợp "phạm vi rỗng" để không báo nhầm "chưa có cán bộ"
  const [staffError, setStaffError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    if (!canRecord || staffLoading) return;
    setStaffLoading(true);
    setStaffError(null);
    try {
      const { data, error } = await supabase.rpc('get_observable_profiles');
      if (error) throw error;
      setStaff((data ?? []) as ObservableProfile[]);
      setStaffLoaded(true);
    } catch (e) {
      console.error('get_observable_profiles error:', e);
      setStaffError(e instanceof Error ? e.message : String(e));
    } finally {
      setStaffLoading(false);
    }
  }, [canRecord, staffLoading]);

  // Nạp sẵn khi có quyền — danh sách nhỏ (trong phạm vi quản lý), dùng cho FAB
  useEffect(() => {
    if (!authLoading && canRecord && !staffLoaded && !staffLoading) void loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canRecord, staffLoaded]);

  return { canRecord, canViewJournal, profileId, staff, staffLoading, staffLoaded, staffError, reloadStaff: loadStaff };
}
