import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { datLichNghi, type NgayNghi } from '@/lib/lichNghi';

/**
 * Nạp lịch nghỉ lễ vào sổ dùng chung của `src/lib/lichNghi.ts`.
 *
 * Chỉ lấy khoảng ±18 tháng quanh hôm nay: mọi đồng hồ chờ/im lặng đều tính
 * trong vài tuần, không cần cả lịch sử. Cache dài vì lịch nghỉ mỗi năm chỉ đổi
 * vài lần, và mỗi lần đổi thì trang quản trị tự làm mới cache này.
 */

const MOT_GIO = 3_600_000;

function bienNam(lech: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + lech);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function useLichNghi() {
  const kq = useQuery({
    queryKey: ['lich-nghi'],
    staleTime: MOT_GIO,
    gcTime: MOT_GIO * 6,
    queryFn: async () => {
      // Bảng lich_nghi_le chưa có trong types.ts sinh tự động — ép kiểu ở đúng
      // ranh giới truy vấn, giống cách các bảng ct2_* đang làm.
      const db = supabase as unknown as {
        from(t: string): {
          select(c: string): {
            gte(c: string, v: string): {
              lte(c: string, v: string): {
                order(c: string): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
              };
            };
          };
        };
      };
      const { data, error } = await db
        .from('lich_nghi_le')
        .select('id, ngay, loai, ten, nhom_id, ma_moc, ghi_chu')
        .gte('ngay', bienNam(-18))
        .lte('ngay', bienNam(18))
        .order('ngay');
      if (error) throw error;
      return (data ?? []) as NgayNghi[];
    },
  });

  // Đổ vào sổ dùng chung ngay khi có dữ liệu. Các hàm thuần đếm ngày làm việc
  // đọc từ sổ này, nên không phải truyền lịch qua từng lớp gọi.
  useEffect(() => {
    if (kq.data) datLichNghi(kq.data);
  }, [kq.data]);

  return kq;
}

/** Gọi sau khi sửa lịch để mọi màn hình đang mở tính lại theo lịch mới */
export function useLamTuoiLichNghi() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['lich-nghi'] });
    // Con số ngày chờ/quá hạn nằm trong cache của Chiêu thức 2 → phải tính lại
    qc.invalidateQueries({ queryKey: ['ct2'] });
  };
}
