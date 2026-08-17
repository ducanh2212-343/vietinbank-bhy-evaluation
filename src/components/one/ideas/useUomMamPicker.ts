import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TRAN_UOM_MAM_MOI_TUAN, dauTuan, type LyDoThuong } from '@/lib/ideaRewards';

// Dữ liệu cho màn "Chốt ý tưởng Ươm mầm" và luồng Bén rễ trình Giám đốc.
//
// Hai trục tách bạch (chỉ đạo 08/2026):
//   ghi_nhan_kpi → tính KPI, chịu hạn mức 02/tuần/phòng (trigger DB gác)
//   muc_thuong   → tiền, ý tưởng trước 16/08/2026 vẫn được thưởng khuyến khích
//                  kể cả khi không được chọn.
//
// Quyền chốt Ươm mầm đọc từ bảng cấu hình bhy_ideas_cau_hinh (đang là 'tcth').

export interface AwardRow {
  ideaId: string;
  capDo: string;
  ghiNhanKpi: boolean;
  /** Chi nhánh duyệt (chốt trong hạn mức tuần) — chiếm suất của phòng */
  duyetCn: boolean;
  /** TSC duyệt trên SMP — KHÔNG chiếm suất; có thể cùng bật với duyetCn */
  duyetTsc: boolean;
  tuanChon: string | null;
  mucThuong: number;
  lyDoThuong: LyDoThuong;
  /** TCTH đã chốt với Trưởng phòng trước khi đưa vào hạn mức */
  chotVoiTp: boolean;
  chotVoiTpGhiChu: string | null;
}

export type AiChonUomMam = 'tcth' | 'truong_phong';

export interface CauHinhIdeas {
  aiChonUomMam: AiChonUomMam;
  tranUomMamMoiTuan: number;
  /** false = tạm dừng áp KPI: trần tuần không chặn, màn hình bỏ ngôn ngữ KPI */
  dangApKpi: boolean;
}

const CAU_HINH_MAC_DINH: CauHinhIdeas = {
  aiChonUomMam: 'tcth',
  tranUomMamMoiTuan: TRAN_UOM_MAM_MOI_TUAN,
  dangApKpi: false,
};

/**
 * Công tắc vận hành. Bảng chỉ có đúng một dòng; đọc hỏng thì rơi về mặc định
 * theo quy chế chứ không khóa màn hình.
 */
export function useCauHinhIdeas() {
  const { data, isLoading } = useQuery({
    queryKey: ['bhy-ideas-cau-hinh'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<CauHinhIdeas> => {
      const { data: row, error } = await supabase
        .from('bhy_ideas_cau_hinh')
        .select('ai_chon_uom_mam, tran_uom_mam_moi_tuan, dang_ap_kpi')
        .maybeSingle();
      if (error) throw error;
      if (!row) return CAU_HINH_MAC_DINH;
      return {
        aiChonUomMam: (row.ai_chon_uom_mam === 'truong_phong' ? 'truong_phong' : 'tcth'),
        tranUomMamMoiTuan: row.tran_uom_mam_moi_tuan ?? TRAN_UOM_MAM_MOI_TUAN,
        dangApKpi: !!row.dang_ap_kpi,
      };
    },
  });

  return { cauHinh: data ?? CAU_HINH_MAC_DINH, isLoading };
}

export interface YTuongTuan {
  id: string;
  title: string;
  proposer: string;
  departmentName: string;
  createdAt: string;
  /** Dòng sổ ghi nhận cấp Ươm mầm (null = chưa ghi nhận gì) */
  award: AwardRow | null;
}

const awardsKey = ['idea-awards'];
const ideasWeekKey = (phong: string) => ['idea-uom-mam-tuan', phong];

/** Giám đốc chi nhánh — hỏi thẳng CSDL để khớp đúng hàm gác quyền của RPC */
export function useLaGiamDoc() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['bhy-ideas-la-giam-doc', user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data: ok, error } = await supabase.rpc('bhy_ideas_la_giam_doc');
      if (error) throw error;
      return !!ok;
    },
  });
  return { laGiamDoc: !!data, isLoading };
}

/** Trưởng phòng / Phó phòng của phòng nào (theo hồ sơ) — quyết định phạm vi chọn */
export function useMyDepartmentForIdeas() {
  const { profileId, roles } = useAuth();
  const laLanhDaoPhong = roles.includes('manager') || roles.includes('pgd');
  const isAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { data, isLoading } = useQuery({
    queryKey: ['my-dept-ideas-name', profileId],
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data: row, error } = await supabase
        .from('profiles')
        .select('department_id, departments(name)')
        .eq('id', profileId!)
        .maybeSingle();
      if (error) throw error;
      const d = row?.departments as unknown as { name: string } | null;
      return d?.name ?? null;
    },
  });

  return { phongHoSo: data ?? null, laLanhDaoPhong, isAdmin, isLoading };
}

/**
 * Ý tưởng của một phòng trong một tuần + trạng thái ghi nhận.
 * `phongIdeas` là tên theo hệ Ideas (VD "Phòng DVKH").
 */
export function useYTuongTheoTuan(phongIdeas: string | null, tuan: string) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: [...ideasWeekKey(phongIdeas ?? 'none'), tuan],
    enabled: !!phongIdeas,
    queryFn: async (): Promise<YTuongTuan[]> => {
      const dau = new Date(`${tuan}T00:00:00`);
      const cuoi = new Date(dau);
      cuoi.setDate(cuoi.getDate() + 7);

      const { data: rows, error } = await supabase
        .from('portal_ideas')
        .select('id, title, proposer, department_name, created_at')
        .eq('department_name', phongIdeas!)
        .gte('created_at', dau.toISOString())
        .lt('created_at', cuoi.toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;

      const ids = (rows ?? []).map(r => r.id);
      let awards: Array<{
        idea_id: string; cap_do: string; ghi_nhan_kpi: boolean;
        duyet_cn: boolean; duyet_tsc: boolean;
        tuan_chon: string | null; muc_thuong: number; ly_do_thuong: string;
        chot_voi_tp: boolean; chot_voi_tp_ghi_chu: string | null;
      }> = [];
      if (ids.length > 0) {
        const { data: aRows, error: aErr } = await supabase
          .from('portal_idea_awards')
          .select('idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, tuan_chon, muc_thuong, ly_do_thuong, chot_voi_tp, chot_voi_tp_ghi_chu')
          .eq('cap_do', 'Ươm mầm')
          .in('idea_id', ids);
        if (aErr) throw aErr;
        awards = aRows ?? [];
      }

      return (rows ?? []).map(r => {
        const a = awards.find(x => x.idea_id === r.id);
        return {
          id: r.id,
          title: r.title,
          proposer: r.proposer,
          departmentName: r.department_name,
          createdAt: r.created_at,
          award: a
            ? {
                ideaId: a.idea_id,
                capDo: a.cap_do,
                ghiNhanKpi: a.ghi_nhan_kpi,
                duyetCn: a.duyet_cn,
                duyetTsc: a.duyet_tsc,
                tuanChon: a.tuan_chon,
                mucThuong: a.muc_thuong,
                lyDoThuong: a.ly_do_thuong as LyDoThuong,
                chotVoiTp: a.chot_voi_tp,
                chotVoiTpGhiChu: a.chot_voi_tp_ghi_chu,
              }
            : null,
        };
      });
    },
  });

  return { items, isLoading };
}

export function useUomMamActions(phongIdeas: string | null, tuan: string) {
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: awardsKey });
    if (phongIdeas) {
      queryClient.invalidateQueries({ queryKey: [...ideasWeekKey(phongIdeas), tuan] });
    }
  }, [queryClient, phongIdeas, tuan]);

  const chon = useCallback(async (
    ideaId: string,
    chotVoiTp = false,
    ghiChu?: string,
  ): Promise<boolean> => {
    const { error } = await supabase.rpc('bhy_ideas_chon_uom_mam', {
      _idea_id: ideaId,
      _tuan_chon: tuan,
      _chot_voi_tp: chotVoiTp,
      _ghi_chu: ghiChu?.trim() ? ghiChu.trim() : null,
    });
    if (error) {
      // Trigger hạn mức trả thông điệp tiếng Việt đầy đủ — hiện nguyên văn
      toast.error(error.message);
      return false;
    }
    toast.success('Đã ghi nhận Ươm mầm cho ý tưởng này');
    refresh();
    return true;
  }, [tuan, refresh]);

  const boChon = useCallback(async (ideaId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('bhy_ideas_bo_chon_uom_mam', { _idea_id: ideaId });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const giuThuong = (data as { giu_thuong_hoi_to?: boolean } | null)?.giu_thuong_hoi_to;
    toast.success(giuThuong
      ? 'Đã bỏ ghi nhận KPI — ý tưởng gửi trước 16/08 vẫn giữ thưởng khuyến khích'
      : 'Đã bỏ ghi nhận và thu hồi suất thưởng');
    refresh();
    return true;
  }, [refresh]);

  return { chon, boChon };
}

/** Danh sách tuần để chọn — từ tuần hiện tại lùi về `soTuan` tuần */
export function cacTuanGanDay(soTuan = 12, moc: Date = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(moc);
  for (let i = 0; i < soTuan; i++) {
    out.push(dauTuan(d));
    d.setDate(d.getDate() - 7);
  }
  return out;
}
