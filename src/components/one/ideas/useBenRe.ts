import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { docPhieuBenRe, goiPhieuBenRe, type PhieuBenRe } from '@/lib/ideaBenRe';
import type { IdeaLevel } from '@/data/one/ideasConfig';

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
  /** Cán bộ đã khai có sản phẩm demo khi gửi — Giám đốc cần thấy ngay, khỏi tra lại */
  coDemo: boolean;
  capDeXuat: IdeaLevel | null;
  developmentLevel: string | null;
  /** Hồ sơ từng được quyết rồi thu hồi — Giám đốc cần biết trước khi quyết lại */
  soLanThuHoi: number;
  lyDoThuHoi: string | null;
  thuHoiLuc: string | null;
  /** Đã bị trả về rồi cán bộ bổ sung — «trình lần n» */
  soLanBoSung: number;
  boSungLuc: string | null;
  boSungGhiChu: string | null;
  lyDoTraVe: string | null;
  traVeBoi: 'tcth' | 'gd' | null;
}

export type TrangThaiSoBenRe =
  | 'cho_gd_duyet' | 'da_ghi_nhan' | 'tu_choi' | 'thu_hoi' | 'tra_ve' | 'da_bo_sung' | 'nuoi_duong' | 'dung';

const docTrangThaiSo = (s: string | null | undefined): TrangThaiSoBenRe | null =>
  (['cho_gd_duyet', 'da_ghi_nhan', 'tu_choi', 'thu_hoi', 'tra_ve', 'da_bo_sung', 'nuoi_duong', 'dung'] as const)
    .find(t => t === s) ?? null;

const docTraVeBoi = (s: string | null | undefined): 'tcth' | 'gd' | null =>
  s === 'tcth' || s === 'gd' ? s : null;

/** Một dòng sổ Bén rễ đầy đủ — tab «Sổ Bén rễ» */
export interface DongSoBenReDayDu {
  ideaId: string;
  title: string;
  proposer: string;
  phong: string;
  coDemo: boolean;
  capDeXuat: IdeaLevel | null;
  developmentLevel: string | null;
  trangThai: TrangThaiSoBenRe;
  duyetCn: boolean;
  duyetTsc: boolean;
  ghiNhanKpi: boolean;
  mucThuong: number;
  traVeBoi: 'tcth' | 'gd' | null;
  lyDoTraVe: string | null;
  traVeLuc: string | null;
  soLanBoSung: number;
  boSungLuc: string | null;
  nguoiDuyet: string | null;
  duyetLuc: string | null;
  nguoiTrinh: string | null;
  trinhLuc: string | null;
  smpMa: string | null;
  smpTrangThai: string | null;
  diemTcth: number | null;
  diemGd: number | null;
  yKienGd: string | null;
  mocGanNhat: string | null;
  lyDoKetLuan: string | null;
  ketLuanLuc: string | null;
  phoiHopTen: string[];
  /** Nội dung ý tưởng — để mở ngay trên sổ, không phải sang tab khác tìm lại */
  currentStatus: string | null;
  proposedSolution: string | null;
  expectedBenefits: string | null;
  danhGiaTcth: PhieuBenRe;
  /** Lời trình của TCTH */
  ghiChu: string | null;
  boSungGhiChu: string | null;
  lyDoThuHoi: string | null;
  thuHoiLuc: string | null;
  soLanThuHoi: number;
}

/** Hồ sơ Bén rễ của chính mình — bảng tra cứu dùng để hiện «cần bổ sung» */
export interface HoSoBenReCuaToi {
  ideaId: string;
  trangThai: TrangThaiSoBenRe;
  traVeBoi: 'tcth' | 'gd' | null;
  lyDoTraVe: string | null;
  traVeLuc: string | null;
  soLanBoSung: number;
  boSungLuc: string | null;
  boSungGhiChu: string | null;
  /** Kết luận của TCTH (nuôi dưỡng / dừng) và các ý tưởng được ghép cùng */
  lyDoKetLuan: string | null;
  ketLuanLuc: string | null;
  phoiHopTen: string[];
  mucThuong: number;
  ghiNhanKpi: boolean;
  duyetCn: boolean;
  duyetTsc: boolean;
  yKienGd: string | null;
  duyetLuc: string | null;
  trinhLuc: string | null;
}

/** Quyết định gần đây của Giám đốc — để tìm lại hồ sơ bấm nhầm */
export interface QuyetDinhGanDay {
  ideaId: string;
  title: string;
  proposer: string;
  phong: string;
  coDemo: boolean;
  capDeXuat: IdeaLevel | null;
  developmentLevel: string | null;
  trangThai: 'da_ghi_nhan' | 'tu_choi';
  duyetCn: boolean;
  duyetTsc: boolean;
  mucThuong: number;
  nguoiDuyet: string | null;
  duyetLuc: string;
  diemTcth: number | null;
  diemGd: number | null;
  yKienGd: string | null;
  soLanThuHoi: number;
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
  /**
   * Cấp đề xuất — quyết định ý tưởng đi ĐƯỜNG NÀO trong hai đường lên Bén rễ:
   * «Nội bộ CN» thì TCTH chấm phiếu rồi trình Giám đốc; «Đề xuất TSC» thì chỉ
   * khớp trạng thái với phê duyệt của Trụ sở chính ở màn Đối chiếu SMP.
   */
  capDeXuat: IdeaLevel | null;
  coDemo: boolean;
  /** Trạng thái dòng sổ (null = chưa có dòng nào) — để gom «đã bổ sung» lên đầu */
  trangThaiSo: TrangThaiSoBenRe | null;
  traVeBoi: 'tcth' | 'gd' | null;
  lyDoTraVe: string | null;
  traVeLuc: string | null;
  boSungLuc: string | null;
  boSungGhiChu: string | null;
  soLanBoSung: number;
  lyDoKetLuan: string | null;
  ketLuanLuc: string | null;
  phoiHopVoi: string[];
  phoiHopTen: string[];
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
        coDemo: !!r.has_demo,
        capDeXuat: (r.cap_de_xuat as IdeaLevel | null) ?? null,
        developmentLevel: r.development_level ?? null,
        soLanThuHoi: r.so_lan_thu_hoi ?? 0,
        lyDoThuHoi: r.ly_do_thu_hoi ?? null,
        thuHoiLuc: r.thu_hoi_luc ?? null,
        soLanBoSung: r.so_lan_bo_sung ?? 0,
        boSungLuc: r.bo_sung_luc ?? null,
        boSungGhiChu: r.bo_sung_ghi_chu ?? null,
        lyDoTraVe: r.ly_do_tra_ve ?? null,
        traVeBoi: docTraVeBoi(r.tra_ve_boi),
      }));
    },
  });

  return { viec: data, isLoading, refetch };
}

const daQuyetKey = ['bhy-ideas-gd-da-quyet'];

/** Quyết định 30 ngày gần đây — Giám đốc và TCTH đọc được, chỉ Giám đốc thu hồi được */
export function useGdDaQuyetGanDay(enabled = true, soNgay = 30) {
  const { data = [], isLoading } = useQuery({
    queryKey: [...daQuyetKey, soNgay],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<QuyetDinhGanDay[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_gd_da_quyet_gan_day', { _so_ngay: soNgay });
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        proposer: r.proposer,
        phong: r.phong,
        coDemo: !!r.has_demo,
        capDeXuat: (r.cap_de_xuat as IdeaLevel | null) ?? null,
        developmentLevel: r.development_level ?? null,
        trangThai: r.trang_thai === 'tu_choi' ? 'tu_choi' : 'da_ghi_nhan',
        duyetCn: r.duyet_cn,
        duyetTsc: r.duyet_tsc,
        mucThuong: r.muc_thuong,
        nguoiDuyet: r.nguoi_duyet,
        duyetLuc: r.duyet_luc,
        diemTcth: r.diem_tcth,
        diemGd: r.diem_gd,
        yKienGd: r.y_kien_gd,
        soLanThuHoi: r.so_lan_thu_hoi ?? 0,
      }));
    },
  });
  return { daQuyet: data, isLoading };
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
        capDeXuat: (r.cap_de_xuat as IdeaLevel | null) ?? null,
        coDemo: !!r.has_demo,
        trangThaiSo: docTrangThaiSo(r.trang_thai_so),
        traVeBoi: docTraVeBoi(r.tra_ve_boi),
        lyDoTraVe: r.ly_do_tra_ve ?? null,
        traVeLuc: r.tra_ve_luc ?? null,
        boSungLuc: r.bo_sung_luc ?? null,
        boSungGhiChu: r.bo_sung_ghi_chu ?? null,
        soLanBoSung: r.so_lan_bo_sung ?? 0,
        lyDoKetLuan: r.ly_do_ket_luan ?? null,
        ketLuanLuc: r.ket_luan_luc ?? null,
        phoiHopVoi: r.phoi_hop_voi ?? [],
        phoiHopTen: r.phoi_hop_ten ?? [],
      }));
    },
  });
  return { ungVien: data, isLoading };
}

const soBenReKey = ['bhy-ideas-so-ben-re'];
const hoSoCuaToiKey = ['bhy-ideas-ho-so-ben-re-cua-toi'];

/** Sổ Bén rễ đầy đủ — Giám đốc và TCTH */
export function useSoBenRe(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: soBenReKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DongSoBenReDayDu[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_so_ben_re');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        proposer: r.proposer,
        phong: r.phong,
        coDemo: !!r.has_demo,
        capDeXuat: (r.cap_de_xuat as IdeaLevel | null) ?? null,
        developmentLevel: r.development_level ?? null,
        trangThai: docTrangThaiSo(r.trang_thai) ?? 'thu_hoi',
        duyetCn: r.duyet_cn,
        duyetTsc: r.duyet_tsc,
        ghiNhanKpi: r.ghi_nhan_kpi,
        mucThuong: r.muc_thuong,
        traVeBoi: docTraVeBoi(r.tra_ve_boi),
        lyDoTraVe: r.ly_do_tra_ve ?? null,
        traVeLuc: r.tra_ve_luc ?? null,
        soLanBoSung: r.so_lan_bo_sung ?? 0,
        boSungLuc: r.bo_sung_luc ?? null,
        nguoiDuyet: r.nguoi_duyet ?? null,
        duyetLuc: r.duyet_luc ?? null,
        nguoiTrinh: r.nguoi_trinh ?? null,
        trinhLuc: r.trinh_luc ?? null,
        smpMa: r.smp_ma ?? null,
        smpTrangThai: r.smp_trang_thai ?? null,
        diemTcth: r.diem_tcth,
        diemGd: r.diem_gd,
        yKienGd: r.y_kien_gd ?? null,
        mocGanNhat: r.moc_gan_nhat ?? null,
        lyDoKetLuan: r.ly_do_ket_luan ?? null,
        ketLuanLuc: r.ket_luan_luc ?? null,
        phoiHopTen: r.phoi_hop_ten ?? [],
        currentStatus: r.current_status ?? null,
        proposedSolution: r.proposed_solution ?? null,
        expectedBenefits: r.expected_benefits ?? null,
        danhGiaTcth: docPhieuBenRe(r.danh_gia_tcth),
        ghiChu: r.ghi_chu ?? null,
        boSungGhiChu: r.bo_sung_ghi_chu ?? null,
        lyDoThuHoi: r.ly_do_thu_hoi ?? null,
        thuHoiLuc: r.thu_hoi_luc ?? null,
        soLanThuHoi: r.so_lan_thu_hoi ?? 0,
      }));
    },
  });
  return { soBenRe: data, isLoading };
}

/** Hồ sơ Bén rễ của chính mình — tra theo ideaId ở bảng tra cứu */
export function useHoSoBenReCuaToi(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: hoSoCuaToiKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<HoSoBenReCuaToi[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_ho_so_ben_re_cua_toi');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        trangThai: docTrangThaiSo(r.trang_thai) ?? 'thu_hoi',
        traVeBoi: docTraVeBoi(r.tra_ve_boi),
        lyDoTraVe: r.ly_do_tra_ve ?? null,
        traVeLuc: r.tra_ve_luc ?? null,
        soLanBoSung: r.so_lan_bo_sung ?? 0,
        boSungLuc: r.bo_sung_luc ?? null,
        boSungGhiChu: r.bo_sung_ghi_chu ?? null,
        lyDoKetLuan: r.ly_do_ket_luan ?? null,
        ketLuanLuc: r.ket_luan_luc ?? null,
        phoiHopTen: r.phoi_hop_ten ?? [],
        mucThuong: r.muc_thuong ?? 0,
        ghiNhanKpi: !!r.ghi_nhan_kpi,
        duyetCn: !!r.duyet_cn,
        duyetTsc: !!r.duyet_tsc,
        yKienGd: r.y_kien_gd ?? null,
        duyetLuc: r.duyet_luc ?? null,
        trinhLuc: r.trinh_luc ?? null,
      }));
    },
  });
  const theoIdea = Object.fromEntries(data.map(h => [h.ideaId, h])) as Record<string, HoSoBenReCuaToi>;
  return { hoSo: data, theoIdea, isLoading };
}

/** Một dòng sổ ghi nhận mọi cấp — dùng cho kết xuất Excel */
export interface DongSoGhiNhan {
  ideaId: string;
  title: string;
  proposer: string;
  phong: string;
  coDemo: boolean;
  capDeXuat: string | null;
  linhVuc: string | null;
  developmentLevel: string | null;
  capDo: string;
  trangThai: string;
  nguonCongNhan: 'giam_doc' | 'tsc' | 'ca_hai' | 'chi_nhanh' | 'hoi_to' | 'luy_ke' | 'hoi_dong' | '';
  duyetCn: boolean;
  duyetTsc: boolean;
  ghiNhanKpi: boolean;
  mucThuong: number;
  lyDoThuong: string;
  tuanChon: string | null;
  nguoiDuyet: string | null;
  duyetLuc: string | null;
  nguoiGhiNhan: string | null;
  ghiNhanLuc: string | null;
  smpMa: string | null;
  smpTrangThai: string | null;
  diemTcth: number | null;
  diemGd: number | null;
  yKienGd: string | null;
  ghiChu: string | null;
  traVeBoi: string | null;
  lyDoTraVe: string | null;
  soLanBoSung: number;
  lyDoKetLuan: string | null;
  lyDoThuHoi: string | null;
  createdAt: string;
}

const soDayDuKey = ['bhy-ideas-so-ghi-nhan-day-du'];

export function useSoGhiNhanDayDu(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: soDayDuKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DongSoGhiNhan[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_so_ghi_nhan_day_du');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        proposer: r.proposer,
        phong: r.phong,
        coDemo: !!r.has_demo,
        capDeXuat: r.cap_de_xuat ?? null,
        linhVuc: r.linh_vuc ?? null,
        developmentLevel: r.development_level ?? null,
        capDo: r.cap_do,
        trangThai: r.trang_thai,
        nguonCongNhan: (r.nguon_cong_nhan as DongSoGhiNhan['nguonCongNhan']) ?? '',
        duyetCn: r.duyet_cn,
        duyetTsc: r.duyet_tsc,
        ghiNhanKpi: r.ghi_nhan_kpi,
        mucThuong: r.muc_thuong,
        lyDoThuong: r.ly_do_thuong,
        tuanChon: r.tuan_chon ?? null,
        nguoiDuyet: r.nguoi_duyet ?? null,
        duyetLuc: r.duyet_luc ?? null,
        nguoiGhiNhan: r.nguoi_ghi_nhan ?? null,
        ghiNhanLuc: r.ghi_nhan_luc ?? null,
        smpMa: r.smp_ma ?? null,
        smpTrangThai: r.smp_trang_thai ?? null,
        diemTcth: r.diem_tcth,
        diemGd: r.diem_gd,
        yKienGd: r.y_kien_gd ?? null,
        ghiChu: r.ghi_chu ?? null,
        traVeBoi: r.tra_ve_boi ?? null,
        lyDoTraVe: r.ly_do_tra_ve ?? null,
        soLanBoSung: r.so_lan_bo_sung ?? 0,
        lyDoKetLuan: r.ly_do_ket_luan ?? null,
        lyDoThuHoi: r.ly_do_thu_hoi ?? null,
        createdAt: r.created_at,
      }));
    },
  });
  return { soGhiNhan: data, isLoading };
}

export function useBenReActions() {
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: viecKey });
    queryClient.invalidateQueries({ queryKey: ungVienKey });
    queryClient.invalidateQueries({ queryKey: daQuyetKey });
    queryClient.invalidateQueries({ queryKey: soBenReKey });
    queryClient.invalidateQueries({ queryKey: soDayDuKey });
    queryClient.invalidateQueries({ queryKey: hoSoCuaToiKey });
    queryClient.invalidateQueries({ queryKey: ['idea-comments'] });
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

  /**
   * Giám đốc thu hồi quyết định của mình (đã công nhận hoặc đã từ chối) —
   * hồ sơ về lại hàng chờ. CSDL gỡ KPI, tiền, lũy kế, trả cấp độ; ở đây chỉ
   * đọc kết quả để nói rõ đã gỡ những gì.
   */
  const thuHoiQuyetDinh = useCallback(async (ideaId: string, lyDo: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('bhy_ideas_gd_thu_hoi_ben_re', {
      _idea_id: ideaId,
      _ly_do: lyDo.trim(),
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const kq = data as { tu_trang_thai?: string; tien_go?: number; luy_ke_go?: number; cap_do_ve?: string | null } | null;
    if (kq?.tu_trang_thai === 'da_ghi_nhan') {
      const tien = (kq.tien_go ?? 0) + (kq.luy_ke_go ?? 0);
      toast.success(
        `Đã thu hồi công nhận — gỡ ${tien.toLocaleString('vi-VN')}đ và ghi nhận KPI, cấp độ về «${kq.cap_do_ve ?? 'Ươm mầm'}». Hồ sơ đã về hàng chờ.`,
      );
    } else {
      toast.success('Đã mở lại hồ sơ — về hàng chờ để quyết lại');
    }
    refresh();
    return true;
  }, [refresh]);

  /** TCTH (hoặc Giám đốc) rút hồ sơ đang chờ — quay về danh sách ứng viên, phiếu giữ nguyên */
  const rutHoSo = useCallback(async (ideaId: string, lyDo: string): Promise<boolean> => {
    const { error } = await supabase.rpc('bhy_ideas_rut_ho_so_ben_re', {
      _idea_id: ideaId,
      _ly_do: lyDo.trim(),
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success('Đã rút hồ sơ khỏi hàng chờ — phiếu chấm vẫn còn để trình lại');
    refresh();
    return true;
  }, [refresh]);

  /**
   * Trả về để cán bộ bổ sung — TCTH (trước khi trình) hoặc Giám đốc (từ hàng
   * chờ). Khác «Chưa đạt»: đây là mở đường cho cán bộ sửa rồi gửi lại. CSDL tự
   * ghi nhật ký lên ý tưởng và báo đẩy cho cán bộ.
   */
  const traVeBoSung = useCallback(async (ideaId: string, lyDo: string, vai: 'tcth' | 'gd'): Promise<boolean> => {
    const { data, error } = await supabase.rpc('bhy_ideas_tra_ve_bo_sung', {
      _idea_id: ideaId,
      _ly_do: lyDo.trim(),
      _vai: vai,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const kq = data as { da_bao?: boolean } | null;
    toast.success(kq?.da_bao
      ? 'Đã trả về — cán bộ sẽ nhận thông báo và thấy khuyến nghị ở bảng tra cứu'
      : 'Đã trả về — cán bộ thấy khuyến nghị ở bảng tra cứu (tin đẩy chờ tới giờ làm việc hoặc người nhận là chính bạn)');
    refresh();
    return true;
  }, [refresh]);

  /** Cán bộ gửi lại sau khi đã sửa nội dung — về tay TCTH chấm lại */
  const guiLaiBoSung = useCallback(async (ideaId: string, ghiChu: string): Promise<boolean> => {
    const { error } = await supabase.rpc('bhy_ideas_gui_lai_bo_sung', {
      _idea_id: ideaId,
      _ghi_chu: ghiChu.trim(),
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success('Đã gửi lại — Phòng TCTH sẽ đánh giá lại và trình Giám đốc');
    refresh();
    return true;
  }, [refresh]);

  /**
   * Kết luận của TCTH trước khi trình: NUÔI DƯỠNG (có thể ghép với ý tưởng
   * khác, mời chủ ý tưởng góp ý) hoặc DỪNG ƯƠM MẦM (chưa khả thi). CSDL ghi
   * nhật ký lên ý tưởng và báo cho chủ ý tưởng (và chủ các ý tưởng được ghép).
   */
  const ketLuanTcth = useCallback(async (
    ideaId: string, ketLuan: 'nuoi_duong' | 'dung', lyDo: string, phoiHopVoi: string[] = [],
  ): Promise<boolean> => {
    const { data, error } = await supabase.rpc('bhy_ideas_ket_luan_tcth', {
      _idea_id: ideaId,
      _ket_luan: ketLuan,
      _ly_do: lyDo.trim(),
      _phoi_hop_voi: phoiHopVoi.length ? phoiHopVoi : null,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const kq = data as { so_phoi_hop?: number; so_bao_phoi_hop?: number } | null;
    toast.success(ketLuan === 'nuoi_duong'
      ? `Đã đưa vào nuôi dưỡng — chủ ý tưởng nhận thông báo mời góp ý${
          kq?.so_phoi_hop ? `; ${kq.so_phoi_hop} ý tưởng ghép cùng cũng được báo` : ''}`
      : 'Đã dừng ươm mầm — chủ ý tưởng nhận thông báo kèm lý do');
    refresh();
    return true;
  }, [refresh]);

  return { trinh, duyet, thuHoiQuyetDinh, rutHoSo, traVeBoSung, guiLaiBoSung, ketLuanTcth };
}
