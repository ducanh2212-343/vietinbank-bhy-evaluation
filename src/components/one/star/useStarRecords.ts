import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { quyVeNhanSao } from './starDepartments';

// Phiếu Sao Xứng Đáng — bảng star_records (mỗi phiếu một dòng). CHỈ ĐỌC.
//
// Từ 04/09/2026 hook này không còn hàm ghi nào: đường nhập Excel (replaceAll)
// đã dừng hẳn sau ba lần phá dữ liệu, và policy trên star_records nay chỉ còn
// quyền đọc. Mọi thao tác ghi đi qua RPC trong useStarSerials:
//   ghi phiếu  → award_star          (số serial khóa trong cùng giao dịch)
//   gỡ phiếu   → revoke_star_record  (số serial quay về đúng nơi giữ)
//   đối soát   → doi_soat_so_sao
//
// Cột `source` vẫn phân biệt phiếu cũ nhập từ Excel ('import') với phiếu ghi
// trên cổng ('form') — dữ liệu lịch sử, không còn đường tạo mới 'import'.

export interface StarRecord {
  id: string;
  name: string;
  /**
   * NHÃN CHUẨN của chương trình Sao ("Phòng DVKH"), đã quy về từ chữ lưu trên phiếu.
   *
   * Phiếu lưu tên phòng dạng bản chụp lúc ghi, nên cùng một đơn vị có nhiều cách
   * viết: tên danh bạ đầy đủ, nhãn Sao rút gọn, và tên cũ trước khi đổi. Bảng thi
   * đua gộp theo chuỗi này nên phải quy về một mối NGAY TẠI CỬA ĐỌC — sửa ở đây là
   * mọi màn (thi đua, cá nhân, ô lọc, kết xuất) cùng đúng, thay vì mỗi nơi tự nhớ.
   */
  department: string;
  /** Chữ đang lưu thật trong CSDL — để khu Quản lý Sao chỉ ra phiếu cần dọn */
  departmentGoc: string;
  stars: number;
  reason: string;
  result: string;
  /** yyyy-mm-dd */
  date: string;
  sender: string;
  serial: string;
  isCollective: boolean;
  source: 'import' | 'form';
  /** Tổ / tập thể nhỏ gắn phiếu (VD "Tổ FDI") — null với đa số phiếu */
  subUnit: string | null;
}

const KEY = ['one-star-records'];

export function useStarRecords() {
  const { roles } = useAuth();
  const isContentAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { data: records = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<StarRecord[]> => {
      const { data, error } = await supabase
        .from('star_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        department: quyVeNhanSao(r.department ?? ''),
        departmentGoc: r.department ?? '',
        stars: Number(r.stars),
        reason: r.reason ?? '',
        result: r.result ?? '',
        date: r.awarded_on,
        sender: r.sender ?? '',
        serial: r.serial ?? '',
        isCollective: r.is_collective,
        source: r.source as 'import' | 'form',
        subUnit: r.sub_unit ?? null,
      }));
    },
    staleTime: 30 * 1000,
  });

  return { records, isLoading, isContentAdmin };
}
