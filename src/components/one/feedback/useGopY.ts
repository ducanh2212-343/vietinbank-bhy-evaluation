import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Góp ý cải thiện hệ thống BHY One — bảng portal_gop_y.
// RLS quyết định phạm vi: cán bộ thường chỉ nhận về góp ý của mình,
// người duyệt (TCTH admin / System admin / BGĐ) nhận về toàn bộ.

export type GopYTrangThai = 'moi' | 'da_xem_xet' | 'da_xu_ly';

export const GOP_Y_TRANG_THAI_LABEL: Record<GopYTrangThai, string> = {
  moi: 'Mới gửi',
  da_xem_xet: 'Đã xem xét',
  da_xu_ly: 'Đã xử lý',
};

/** Một menu/tính năng được tick trên form góp ý */
export interface GopYMuc {
  path: string;
  label: string;
}

export interface GopY {
  id: string;
  noiDung: string;
  mucLienQuan: GopYMuc[];
  trangGui: string | null;
  nguoiGui: string;
  phongBan: string | null;
  trangThai: GopYTrangThai;
  danhDauLuc: string | null;
  createdAt: string;
  createdBy: string;
  isMine: boolean;
}

export interface GopYInput {
  noiDung: string;
  mucLienQuan: GopYMuc[];
  trangGui: string;
  nguoiGui: string;
  phongBan: string | null;
}

const GOP_Y_KEY = ['bhy-gop-y'];

function docMucLienQuan(raw: unknown): GopYMuc[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is GopYMuc =>
      !!m && typeof m === 'object'
      && typeof (m as GopYMuc).path === 'string'
      && typeof (m as GopYMuc).label === 'string',
  );
}

/**
 * `enabled=false` khi chỉ cần các hàm ghi (nút góp ý lúc chưa mở form):
 * nút nằm trên MỌI trang nên không được tự tải danh sách khi chưa ai bấm.
 */
export function useGopY(enabled = true) {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  // Cùng bộ vai trò với hàm la_nguoi_duyet_gop_y phía server
  const laNguoiDuyet = roles.some((r) => ['tcth_admin', 'system_admin', 'bgd'].includes(r));

  const { data: gopYs = [], isLoading } = useQuery({
    queryKey: GOP_Y_KEY,
    enabled: !!user && enabled,
    queryFn: async (): Promise<GopY[]> => {
      const { data, error } = await supabase
        .from('portal_gop_y')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        noiDung: r.noi_dung,
        mucLienQuan: docMucLienQuan(r.muc_lien_quan),
        trangGui: r.trang_gui,
        nguoiGui: r.nguoi_gui,
        phongBan: r.phong_ban,
        trangThai: r.trang_thai as GopYTrangThai,
        danhDauLuc: r.danh_dau_luc,
        createdAt: r.created_at,
        createdBy: r.created_by,
        isMine: r.created_by === user?.id,
      }));
    },
    staleTime: 30 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: GOP_Y_KEY }),
    [queryClient],
  );

  const guiGopY = useCallback(async (input: GopYInput): Promise<boolean> => {
    const { error } = await supabase.from('portal_gop_y').insert({
      noi_dung: input.noiDung.trim(),
      // Ép về mảng object thuần cho khớp kiểu Json (GopYMuc không có index signature)
      muc_lien_quan: input.mucLienQuan.map((m) => ({ path: m.path, label: m.label })),
      trang_gui: input.trangGui,
      nguoi_gui: input.nguoiGui,
      phong_ban: input.phongBan,
    });
    if (error) {
      toast.error(`Không gửi được góp ý: ${error.message}`);
      return false;
    }
    toast.success('Đã gửi góp ý — cảm ơn bạn đã chung tay cải thiện BHY One!');
    refresh();
    return true;
  }, [refresh]);

  /** Người gửi rút lại góp ý còn trạng thái 'moi' (RLS chặn các trường hợp khác) */
  const xoaGopY = useCallback(async (id: string) => {
    const { error } = await supabase.from('portal_gop_y').delete().eq('id', id);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã rút lại góp ý');
    refresh();
  }, [refresh]);

  /** Người duyệt tích «Đã xem xét» / «Đã xử lý» (hoặc bỏ tích về 'moi') */
  const capNhatTrangThai = useCallback(async (id: string, trangThai: GopYTrangThai) => {
    const { error } = await supabase.rpc('gop_y_cap_nhat_trang_thai', {
      _id: id,
      _trang_thai: trangThai,
    });
    if (error) {
      toast.error(`Không cập nhật được: ${error.message}`);
      return;
    }
    refresh();
  }, [refresh]);

  return { gopYs, isLoading, laNguoiDuyet, guiGopY, xoaGopY, capNhatTrangThai };
}
