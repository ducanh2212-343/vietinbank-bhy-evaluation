import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { HO_SO_PHONG_SANG_IDEAS, type IdeaDepartment } from '@/data/one/ideasConfig';

// Danh bạ cán bộ cho ô chọn người đề xuất / đồng đề xuất của BHY Ideas.
// Nguồn: RPC bhy_danh_ba_can_bo (chỉ trả họ tên + phòng, chặn khách đối tác) —
// RLS bảng profiles không cho cán bộ thường đọc hồ sơ người khác.

export interface StaffOption {
  userId: string;
  fullName: string;
  /** Tên phòng theo hệ của Ideas; null khi hồ sơ chưa gắn phòng hoặc phòng lạ */
  department: IdeaDepartment | null;
}

export function useStaffDirectory() {
  const { user, isGuest } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['one-danh-ba-can-bo'],
    enabled: !!user && !isGuest,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<StaffOption[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_danh_ba_can_bo');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        userId: r.user_id,
        fullName: r.ho_ten,
        department: HO_SO_PHONG_SANG_IDEAS[r.phong] ?? null,
      }));
    },
  });

  /** Hồ sơ của chính người đang đăng nhập — dùng làm người đề xuất mặc định */
  const me = useMemo(
    () => data.find(s => s.userId === user?.id) ?? null,
    [data, user?.id],
  );

  return { staff: data, me, isLoading };
}
