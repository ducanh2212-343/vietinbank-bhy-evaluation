import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyFullName } from '@/components/one/useMyFullName';
import { standardizeDepartment } from './starParser';
import { selectMyStarRecords } from './starStats';
import { useStarRecords, type StarRecord } from './useStarRecords';

/**
 * Tên phòng của cán bộ đang đăng nhập, quy về đúng nhãn dùng trong phiếu sao
 * ("Phòng giao dịch Ân Thi" trong danh bạ → "Phòng Ân Thi" trên phiếu).
 */
function useMyStarDepartment(): string | null {
  const { departmentId } = useAuth();
  const { data } = useQuery({
    queryKey: ['one-my-star-department', departmentId],
    enabled: !!departmentId,
    queryFn: async (): Promise<string | null> => {
      const { data: row } = await supabase
        .from('departments')
        .select('name')
        .eq('id', departmentId!)
        .maybeSingle();
      return row?.name ? standardizeDepartment(row.name) : null;
    },
    staleTime: 30 * 60 * 1000,
  });
  return data ?? null;
}

/**
 * Sao Xứng Đáng của chính cán bộ đang đăng nhập.
 *
 * Lọc kèm phòng ban, vì chi nhánh có cán bộ TRÙNG HỌ TÊN (hai chị Nguyễn Thị Phượng
 * — Phòng TCTH và Phòng Ân Thi): lọc theo mỗi họ tên thì mỗi chị nhìn thấy cả sao
 * của người kia.
 */
export function useMyStars(): { myRecords: StarRecord[]; myStars: number } {
  const myName = useMyFullName();
  const myDepartment = useMyStarDepartment();
  const { records } = useStarRecords();

  const myRecords = useMemo(
    () => selectMyStarRecords(records, myName, myDepartment),
    [records, myName, myDepartment],
  );
  const myStars = useMemo(
    () => myRecords.reduce((sum, r) => sum + (Number(r.stars) || 0), 0),
    [myRecords],
  );

  return { myRecords, myStars };
}
