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
 * Quyền Nhật ký hành vi của người dùng hiện tại.
 *
 * canRecord KHÔNG suy từ role đăng nhập. Hệ thống chỉ cho mỗi tài khoản MỘT
 * role, nên lãnh đạo kiêm quản trị (Trưởng/Phó phòng TCTH mang 'tcth_admin',
 * Giám đốc mang 'system_admin') từng bị chặn ghi nhận chính cán bộ mình quản.
 * Nay UI hỏi thẳng server: RPC get_observable_profiles trả về những cán bộ
 * mình được ghi (server lọc bằng can_record_profile) — có ít nhất một người
 * thì hiện nút Ghi nhanh. Nhờ vậy UI luôn khớp RLS, không phải đoán lại luật.
 *
 * - staff: danh sách cán bộ trong phạm vi ghi nhận
 * - canViewJournal: người ghi được, hoặc admin chi nhánh (đọc bản đã xác nhận
 *   loại 'quan_ly' — RLS quyết định), nhưng admin thuần không ghi nghiệp vụ
 */
export function useBehaviorAccess() {
  const { roles, profileId, isGuest, loading: authLoading } = useAuth();
  const isBranchAdmin = roles.some((r) => r === 'tcth_admin' || r === 'system_admin');

  const [staff, setStaff] = useState<ObservableProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);
  // Lỗi khi gọi RPC (VD: database chưa áp migration hành vi) — UI phải phân
  // biệt với trường hợp "phạm vi rỗng" để không báo nhầm "chưa có cán bộ"
  const [staffError, setStaffError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
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
  }, []);

  // Nạp một lần cho mọi người đã đăng nhập (trừ khách đối tác): danh sách nhỏ,
  // cán bộ không quản ai nhận về mảng rỗng và không thấy nút Ghi nhanh.
  useEffect(() => {
    if (!authLoading && profileId && !isGuest && !staffLoaded && !staffLoading) void loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileId, isGuest, staffLoaded]);

  const canRecord = staff.length > 0;
  const canViewJournal = canRecord || isBranchAdmin;
  // Còn đang tra quyền — trang gác quyền phải chờ, tránh chớp màn "không có quyền"
  const accessLoading = authLoading || (!isGuest && !!profileId && !staffLoaded && !staffError);

  return {
    canRecord, canViewJournal, accessLoading, profileId,
    staff, staffLoading, staffLoaded, staffError, reloadStaff: loadStaff,
  };
}
