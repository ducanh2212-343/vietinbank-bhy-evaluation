import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { datCauHinhNhip, type CauHinhNhip } from '@/lib/cauHinhNhip';

/**
 * Nạp mốc giờ nhịp của Chi nhánh vào sổ dùng chung của `src/lib/cauHinhNhip.ts`.
 *
 * Cache dài: mốc giờ mỗi năm đổi vài lần, và trang cài đặt tự làm mới cache này
 * ngay sau khi lưu.
 */

const MOT_GIO = 3_600_000;

export function useCauHinhNhip() {
  const kq = useQuery({
    queryKey: ['cau-hinh-nhip'],
    staleTime: MOT_GIO,
    gcTime: MOT_GIO * 6,
    queryFn: async () => {
      // Bảng chưa có trong types.ts sinh tự động — ép kiểu ở đúng ranh giới truy vấn
      const db = supabase as unknown as {
        from(t: string): {
          select(c: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
        };
      };
      const { data } = await db.from('ct2_cau_hinh_thoi_gian')
        .select('gio_dung_gio, gio_an_han, gio_mo_nhip, gio_dong_nhip, gio_yen_tinh_tu, gio_yen_tinh_den, nguong_tuoi_cho, nguong_im_lang_ho_so, tran_thong_bao')
        .maybeSingle();
      return (data ?? null) as CauHinhNhip | null;
    },
  });

  useEffect(() => {
    if (kq.data) datCauHinhNhip(kq.data);
  }, [kq.data]);

  return kq;
}

/** Gọi sau khi sửa cấu hình để mọi màn hình đang mở tính lại theo mốc mới */
export function useLamTuoiCauHinhNhip() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['cau-hinh-nhip'] });
    qc.invalidateQueries({ queryKey: ['ct2'] });
  };
}
