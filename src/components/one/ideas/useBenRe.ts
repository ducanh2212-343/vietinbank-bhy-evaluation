import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { docPhieuBenRe, goiPhieuBenRe, type PhieuBenRe } from '@/lib/ideaBenRe';

// Luồng cấp BÉN RỄ — TCTH trình LIÊN TỤC, Giám đốc phê duyệt (chỉ đạo 08/2026).
//
// Vì sao trình liên tục: gom theo tháng thì ý tưởng chín từ đầu tháng phải nằm
// chờ hết kỳ mới được ghi nhận, vừa chậm vừa dồn việc cho Giám đốc một lúc.
//
// Cấp Bén rễ KHÔNG có hạn mức tuần (hạn mức 02/tuần/phòng chỉ đặt ở Ươm mầm),
// nhưng dòng sổ vẫn phải qua trạng thái chờ để KPI không cộng trước phần chưa
// có người quyết.

export interface ViecGiamDoc {
  ideaId: string;
  title: string;
  proposer: string;
  expectedBenefits: string | null;
  currentStatus: string | null;
  proposedSolution: string | null;
  phong: string;
  createdAt: string;
  trinhLuc: string;
  nguoiTrinh: string | null;
  ghiChu: string | null;
  soNgayCho: number;
  /** Phiếu đánh giá tham khảo TCTH đã chấm khi trình — chính là báo cáo */
  danhGiaTcth: PhieuBenRe;
  diemTcth: number | null;
}

/** Ý tưởng TCTH có thể đánh giá và trình — chưa đạt Bén rễ, không đang chờ duyệt */
export interface UngVienBenRe {
  ideaId: string;
  title: string;
  proposer: string;
  phong: string;
  currentStatus: string | null;
  proposedSolution: string | null;
  expectedBenefits: string | null;
  createdAt: string;
  developmentLevel: string;
  smpTrangThai: string;
  /** Đã từng bị Giám đốc từ chối — TCTH nên bổ sung trước khi trình lại */
  daTungTuChoi: boolean;
  /** Phiếu đã chấm dở lần trước, nếu có */
  danhGiaTcth: PhieuBenRe;
}

const viecKey = ['bhy-ideas-viec-giam-doc'];

/** Hàng chờ phê duyệt Bén rễ — ai cũng đọc được, chỉ Giám đốc quyết được */
export function useViecCuaGiamDoc(enabled = true) {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: viecKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ViecGiamDoc[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_viec_cua_giam_doc');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        proposer: r.proposer,
        expectedBenefits: r.expected_benefits,
        phong: r.phong,
        createdAt: r.created_at,
        trinhLuc: r.trinh_luc,
        nguoiTrinh: r.nguoi_trinh,
        currentStatus: r.current_status,
        proposedSolution: r.proposed_solution,
        ghiChu: r.ghi_chu,
        soNgayCho: r.so_ngay_cho,
        danhGiaTcth: docPhieuBenRe(r.danh_gia_tcth),
        diemTcth: r.diem_tcth,
      }));
    },
  });

  return { viec: data, isLoading, refetch };
}

const ungVienKey = ['bhy-ideas-ung-vien-ben-re'];

/** Ứng viên để TCTH đánh giá — RPC tự gác quyền, người khác gọi được cũng rỗng */
export function useUngVienBenRe(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: ungVienKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UngVienBenRe[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_ung_vien_ben_re');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        proposer: r.proposer,
        phong: r.phong,
        currentStatus: r.current_status,
        proposedSolution: r.proposed_solution,
        expectedBenefits: r.expected_benefits,
        createdAt: r.created_at,
        developmentLevel: r.development_level,
        smpTrangThai: r.smp_trang_thai,
        daTungTuChoi: r.da_tung_tu_choi,
        danhGiaTcth: docPhieuBenRe(r.danh_gia_tcth),
      }));
    },
  });
  return { ungVien: data, isLoading };
}

export function useBenReActions() {
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: viecKey });
    queryClient.invalidateQueries({ queryKey: ungVienKey });
    queryClient.invalidateQueries({ queryKey: ['idea-awards'] });
    queryClient.invalidateQueries({ queryKey: ['one-portal-ideas'] });
  }, [queryClient]);

  /** TCTH trình một ý tưởng lên Giám đốc xin công nhận Bén rễ */
  const trinh = useCallback(async (
    ideaId: string,
    ghiChu?: string,
    danhGia?: PhieuBenRe,
  ): Promise<boolean> => {
    const { data, error } = await supabase.rpc('bhy_ideas_trinh_ben_re', {
      _idea_id: ideaId,
      _ghi_chu: ghiChu?.trim() ? ghiChu.trim() : null,
      _danh_gia: danhGia ? goiPhieuBenRe(danhGia) : null,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const kq = data as { da_ghi_nhan?: boolean; trinh_moi?: boolean } | null;
    if (kq?.da_ghi_nhan) {
      toast.info('Ý tưởng này đã được công nhận Bén rễ trước đó');
    } else {
      toast.success('Đã trình Giám đốc — hệ thống sẽ nhắc khi có việc chờ duyệt');
    }
    refresh();
    return true;
  }, [refresh]);

  /** Giám đốc duyệt hoặc từ chối */
  const duyet = useCallback(async (
    ideaId: string,
    dongY: boolean,
    ghiChu?: string,
    danhGia?: PhieuBenRe,
  ): Promise<boolean> => {
    const { data, error } = await supabase.rpc('bhy_ideas_gd_duyet_ben_re', {
      _idea_id: ideaId,
      _dong_y: dongY,
      _ghi_chu: ghiChu?.trim() ? ghiChu.trim() : null,
      _danh_gia: danhGia ? goiPhieuBenRe(danhGia) : null,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const kq = data as { thuong_luy_ke?: number } | null;
    const buThem = kq?.thuong_luy_ke ?? 0;
    toast.success(
      dongY
        ? buThem > 0
          ? `Đã công nhận Bén rễ — thưởng 300.000đ, cộng ${buThem.toLocaleString('vi-VN')}đ lũy kế cấp dưới`
          : 'Đã công nhận Bén rễ — thưởng 300.000đ'
        : 'Đã ghi nhận ý kiến không đồng ý',
    );
    refresh();
    return true;
  }, [refresh]);

  return { trinh, duyet };
}
