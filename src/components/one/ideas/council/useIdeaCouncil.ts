import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { yTuongCuaToiKey } from '../useYTuongCuaToi';
import type { PhienTrinhBay, TrangThaiPhien } from '@/lib/ideaCouncilPhien';
import {
  docTongHopRpc,
  type CapXet,
  type DeXuatHoiDong,
  type TangDeXuat,
  type TieuChiKey,
  type TrangThaiDot,
  type XungDotLoiIch,
} from '@/lib/ideaCouncil';

// Dữ liệu Chấm điểm Hội đồng BHY Ideas — 4 bảng portal_idea_council_* + các
// RPC tổng hợp/tiến độ/công bố. Phân quyền phản chiếu đúng backend — RLS mới
// là lớp chặn thật, hook chỉ để dựng UI.

/**
 * Quyền truy cập: thành viên/Chủ tịch đọc từ BẢNG portal_idea_council_members
 * (dòng của chính mình — học theo useCouncilAccess của Hội đồng đầu mối);
 * isAdmin/isSystemAdmin vẫn theo vai trò.
 */
export function useIdeaCouncilAccess() {
  const { roles, profileId, loading: authLoading } = useAuth();
  const isAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');
  const isSystemAdmin = roles.includes('system_admin');

  const { data, isLoading } = useQuery({
    queryKey: ['idea-council-my-membership', profileId],
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('portal_idea_council_members')
        .select('is_active, is_chair')
        .eq('profile_id', profileId!)
        .maybeSingle();
      if (error) throw error;
      return { isMember: !!row?.is_active, isChair: !!row?.is_active && !!row?.is_chair };
    },
  });

  return {
    loading: authLoading || (!!profileId && isLoading),
    isMember: data?.isMember ?? false,
    /** Chủ tịch Hội đồng (Giám đốc CN): vượt khóa xem tổng hợp + bấm công bố */
    isChair: data?.isChair ?? false,
    /** Vận hành đợt chấm + tổng hợp ẩn danh (Admin TCTH / System Admin) */
    isAdmin,
    /** Duy nhất được xem phiếu ĐỊNH DANH (ẩn danh cả với TCTH/BGĐ — chốt 08/2026) */
    isSystemAdmin,
  };
}

export interface CouncilRound {
  id: string;
  name: string;
  status: TrangThaiDot;
  /** Đợt xét Vươn cành hay đợt xét Lan tỏa — hai cấp họp tách bạch (16/09/2026) */
  capXet: CapXet;
  note: string | null;
  votingDeadline: string | null;
  resultsPublished: boolean;
  /** Mốc lần công bố đã ghi sổ thưởng — null là chưa ghi */
  ghiSoLuc: string | null;
  createdAt: string;
}

export interface CouncilVote {
  id: string;
  itemId: string;
  userId: string;
  /** 'draft' = nháp lưu dở (không vào tổng hợp) · 'submitted' = đã gửi */
  status: 'draft' | 'submitted';
  xungDot: XungDotLoiIch | null;
  diem: Partial<Record<TieuChiKey, number>>;
  deXuat: DeXuatHoiDong | null;
  gopY: string | null;
  updatedAt: string;
}

export interface CouncilItem {
  id: string;
  roundId: string;
  ideaCode: string;
  proposedTier: TangDeXuat;
  /** Phiên trình bày đang chứa ý tưởng này (null = chưa xếp phiên) */
  sessionId: string | null;
  /** Thứ tự trình bày trong phiên */
  thuTu: number;
  idea: {
    id: string;
    title: string;
    departmentName: string;
    level: string;
    proposer: string;
    currentStatus: string;
    proposedSolution: string;
    expectedBenefits: string;
    developmentLevel: string;
    hasDemo: boolean;
    /** Tài khoản gửi phiếu ý tưởng — client dùng báo trước ca bị chặn tự chấm */
    createdBy: string;
  };
  /** Phiếu của chính người đang đăng nhập (null = chưa chấm) */
  myVote: CouncilVote | null;
  /**
   * Phiếu định danh RLS cho đọc — thành viên/TCTH chỉ thấy phiếu MÌNH,
   * duy nhất System Admin thấy toàn bộ (chốt ẩn danh 08/2026)
   */
  votes: CouncilVote[];
}

/** Phiếu ẩn danh cho khung tổng hợp của TCTH — không danh tính, không mốc giờ */
export interface AnonBallot {
  voteId: string;
  itemId: string;
  xungDot: XungDotLoiIch;
  diem: Record<TieuChiKey, number>;
  deXuat: DeXuatHoiDong;
  gopY: string | null;
  /** Phiếu bị loại khỏi điểm vì sao (cung_phong / lien_phong / tu_de_xuat); null = tính bình thường */
  lyDoLoai: LyDoKhongCham | null;
}

/** Lý do một thành viên KHÔNG chấm một ý tưởng — trùng bhy_ideas_hd_ly_do_khong_cham */
export type LyDoKhongCham = 'tu_de_xuat' | 'cung_phong' | 'lien_phong' | 'khong_ton_tai';

export const LY_DO_KHONG_CHAM_LABELS: Record<LyDoKhongCham, string> = {
  tu_de_xuat: 'Bạn là người đề xuất / đồng đề xuất ý tưởng này',
  cung_phong: 'Bạn thuộc phòng đề xuất ý tưởng này',
  lien_phong: 'Bạn thuộc phòng có cán bộ đồng đề xuất ý tưởng này',
  khong_ton_tai: 'Ý tưởng không còn trong đợt',
};

const ROUNDS_KEY = ['idea-council-rounds'];
const MEMBERS_KEY = ['idea-council-members'];
const itemsKey = (roundId: string) => ['idea-council-items', roundId];
const summaryKey = (roundId: string) => ['idea-council-summary', roundId];
const ballotsKey = (roundId: string) => ['idea-council-anon-ballots', roundId];
const progressKey = (roundId: string) => ['idea-council-progress', roundId];
const phienKey = (roundId: string) => ['idea-council-phien', roundId];
const vangKey = (roundId: string) => ['idea-council-vang', roundId];
const duocChamKey = (roundId: string) => ['idea-council-duoc-cham', roundId];
const ungVienKey = (roundId: string) => ['idea-council-ung-vien', roundId];

type VoteRow = {
  id: string;
  item_id: string;
  user_id: string;
  status: string;
  conflict_status: string | null;
  score_problem: number | null;
  score_impact: number | null;
  score_feasible: number | null;
  score_safety: number | null;
  score_scale: number | null;
  recommendation: string | null;
  gop_y: string | null;
  updated_at: string;
};

const mapVote = (v: VoteRow): CouncilVote => {
  const diem: Partial<Record<TieuChiKey, number>> = {};
  if (v.score_problem != null) diem.problem = v.score_problem;
  if (v.score_impact != null) diem.impact = v.score_impact;
  if (v.score_feasible != null) diem.feasible = v.score_feasible;
  if (v.score_safety != null) diem.safety = v.score_safety;
  if (v.score_scale != null) diem.scale = v.score_scale;
  return {
    id: v.id,
    itemId: v.item_id,
    userId: v.user_id,
    status: v.status as 'draft' | 'submitted',
    xungDot: (v.conflict_status as XungDotLoiIch | null) ?? null,
    diem,
    deXuat: (v.recommendation as DeXuatHoiDong | null) ?? null,
    gopY: v.gop_y,
    updatedAt: v.updated_at,
  };
};

export function useCouncilRounds(enabled: boolean) {
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ROUNDS_KEY,
    enabled,
    queryFn: async (): Promise<CouncilRound[]> => {
      const { data, error } = await supabase
        .from('portal_idea_council_rounds')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status as TrangThaiDot,
        capXet: (r.cap_xet === 'Lan tỏa' ? 'Lan tỏa' : 'Vươn cành') as CapXet,
        note: r.note,
        votingDeadline: r.voting_deadline,
        resultsPublished: r.results_published,
        ghiSoLuc: r.ghi_so_luc,
        createdAt: r.created_at,
      }));
    },
  });
  return { rounds, isLoading };
}

/** Danh sách ý tưởng của một đợt kèm phiếu đọc được theo RLS */
export function useCouncilRoundItems(roundId: string | null) {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useQuery({
    queryKey: itemsKey(roundId ?? 'none'),
    enabled: !!roundId,
    queryFn: async (): Promise<CouncilItem[]> => {
      const { data: rows, error } = await supabase
        .from('portal_idea_council_items')
        .select('id, round_id, idea_code, proposed_tier, phien_id, thu_tu, portal_ideas(id, title, department_name, level, proposer, current_status, proposed_solution, expected_benefits, development_level, has_demo, created_by)')
        .eq('round_id', roundId!)
        .order('idea_code', { ascending: true });
      if (error) throw error;

      const ids = (rows ?? []).map(r => r.id);
      let votes: VoteRow[] = [];
      if (ids.length > 0) {
        const { data: voteRows, error: vErr } = await supabase
          .from('portal_idea_council_votes')
          .select('*')
          .in('item_id', ids);
        if (vErr) throw vErr;
        votes = (voteRows ?? []) as VoteRow[];
      }

      return (rows ?? []).map(r => {
        const idea = r.portal_ideas as unknown as {
          id: string; title: string; department_name: string; level: string; proposer: string;
          current_status: string | null; proposed_solution: string | null; expected_benefits: string | null;
          development_level: string; has_demo: boolean; created_by: string;
        };
        const itemVotes = votes.filter(v => v.item_id === r.id).map(mapVote);
        return {
          id: r.id,
          roundId: r.round_id,
          ideaCode: r.idea_code,
          proposedTier: r.proposed_tier as TangDeXuat,
          sessionId: r.phien_id,
          thuTu: r.thu_tu,
          idea: {
            id: idea.id,
            title: idea.title,
            departmentName: idea.department_name,
            level: idea.level,
            proposer: idea.proposer,
            currentStatus: idea.current_status ?? '',
            proposedSolution: idea.proposed_solution ?? '',
            expectedBenefits: idea.expected_benefits ?? '',
            developmentLevel: idea.development_level,
            hasDemo: idea.has_demo,
            createdBy: idea.created_by,
          },
          myVote: itemVotes.find(v => v.userId === user?.id) ?? null,
          votes: itemVotes,
        };
      });
    },
  });
  return { items, isLoading };
}

/** Nội dung phiếu đang soạn — nháp cho phép thiếu, gửi thật thì form đã validate đủ */
export interface PhieuGui {
  /** A4 cũ — đã bỏ 16/09/2026, phiếu mới gửi null */
  xungDot?: XungDotLoiIch | null;
  diem: Partial<Record<TieuChiKey, number>>;
  deXuat: DeXuatHoiDong | null;
  gopY: string;
}

export function useCouncilMutations(roundId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ROUNDS_KEY });
    queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    // Công bố nâng cấp độ ý tưởng — số theo cấp của chủ ý tưởng phải đổi ngay
    queryClient.invalidateQueries({ queryKey: yTuongCuaToiKey });
    if (roundId) {
      queryClient.invalidateQueries({ queryKey: itemsKey(roundId) });
      queryClient.invalidateQueries({ queryKey: summaryKey(roundId) });
      queryClient.invalidateQueries({ queryKey: ballotsKey(roundId) });
      queryClient.invalidateQueries({ queryKey: progressKey(roundId) });
      queryClient.invalidateQueries({ queryKey: phienKey(roundId) });
      queryClient.invalidateQueries({ queryKey: vangKey(roundId) });
      queryClient.invalidateQueries({ queryKey: duocChamKey(roundId) });
      queryClient.invalidateQueries({ queryKey: ungVienKey(roundId) });
    }
    // Công bố ghi sổ + nâng cấp độ → bảng tra cứu và sổ ghi nhận đổi theo
    queryClient.invalidateQueries({ queryKey: ['portal-ideas'] });
  }, [queryClient, roundId]);

  /** Lưu nháp hoặc gửi phiếu của chính mình (upsert theo item_id + user_id) */
  const guiPhieu = useCallback(async (
    itemId: string,
    phieu: PhieuGui,
    trangThai: 'draft' | 'submitted',
  ): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from('portal_idea_council_votes').upsert({
      item_id: itemId,
      user_id: user.id,
      status: trangThai,
      conflict_status: phieu.xungDot ?? null,
      score_problem: phieu.diem.problem ?? null,
      score_impact: phieu.diem.impact ?? null,
      score_feasible: phieu.diem.feasible ?? null,
      score_safety: phieu.diem.safety ?? null,
      score_scale: phieu.diem.scale ?? null,
      recommendation: phieu.deXuat,
      gop_y: phieu.gopY.trim() || null,
    }, { onConflict: 'item_id,user_id' });
    if (error) {
      toast.error(`Không lưu được phiếu chấm: ${error.message}`);
      return false;
    }
    toast.success(trangThai === 'draft' ? 'Đã lưu nháp phiếu chấm' : 'Đã gửi phiếu chấm của bạn');
    refresh();
    return true;
  }, [user, refresh]);

  // ---- Quản trị (TCTH/System) — RLS chặn nếu thiếu quyền ----

  const taoDot = useCallback(async (
    name: string, note: string, deadline: string | null, capXet: CapXet = 'Vươn cành',
  ): Promise<boolean> => {
    const { error } = await supabase.from('portal_idea_council_rounds')
      .insert({ name: name.trim(), note: note.trim() || null, voting_deadline: deadline, cap_xet: capXet });
    if (error) {
      toast.error(`Không tạo được đợt chấm: ${error.message}`);
      return false;
    }
    toast.success('Đã tạo đợt chấm mới');
    refresh();
    return true;
  }, [refresh]);

  const doiTrangThaiDot = useCallback(async (id: string, status: TrangThaiDot) => {
    const { error } = await supabase.from('portal_idea_council_rounds')
      .update({ status }).eq('id', id);
    if (error) {
      toast.error(`Không đổi được trạng thái: ${error.message}`);
      return;
    }
    toast.success('Đã cập nhật trạng thái đợt chấm');
    refresh();
  }, [refresh]);

  const datHanChot = useCallback(async (id: string, deadline: string | null) => {
    const { error } = await supabase.from('portal_idea_council_rounds')
      .update({ voting_deadline: deadline }).eq('id', id);
    if (error) {
      toast.error(`Không đặt được hạn chấm: ${error.message}`);
      return;
    }
    toast.success(deadline ? 'Đã đặt hạn gửi phiếu' : 'Đã bỏ hạn gửi phiếu');
    refresh();
  }, [refresh]);

  /**
   * Công bố/khóa kết quả — quyền Chủ tịch Hội đồng + System Admin (RPC tự gác).
   * Công bố lần đầu là GHI SỔ THƯỞNG, nâng cấp độ, báo chủ ý tưởng (16/09/2026);
   * công bố lại không ghi trùng; khóa không thu hồi thưởng.
   */
  const congBoKetQua = useCallback(async (id: string, published: boolean) => {
    const { data, error } = await supabase.rpc('bhy_ideas_hd_cong_bo', {
      _round_id: id,
      _published: published,
    });
    if (error) {
      toast.error(`Không ${published ? 'công bố' : 'khóa'} được kết quả: ${error.message}`);
      return;
    }
    const kq = (data ?? {}) as { so_dat?: number; so_khong_dat?: number; tong_tien?: number; da_ghi_so_truoc_do?: boolean };
    if (!published) toast.success('Đã khóa kết quả lại (thưởng đã ghi sổ giữ nguyên)');
    else if (kq.da_ghi_so_truoc_do) toast.success('Đã mở lại kết quả — sổ thưởng đã ghi từ lần công bố trước, không ghi trùng');
    else {
      toast.success(
        `Đã công bố: ${kq.so_dat ?? 0} ý tưởng đạt, ${kq.so_khong_dat ?? 0} chưa đạt — ghi sổ ${(kq.tong_tien ?? 0).toLocaleString('vi-VN')}đ, đã báo chủ ý tưởng`,
        { duration: 8000 },
      );
    }
    refresh();
  }, [refresh]);

  // Tầng đề xuất suy từ cấp xét của đợt — trigger CSDL ghi đè và chặn ý tưởng
  // không hợp cấp (đã Vươn cành, hoặc chưa đủ 30 ngày để xét Lan tỏa)
  const themYTuong = useCallback(async (
    rid: string, ideaId: string, ideaCode: string, capXet: TangDeXuat,
  ): Promise<boolean> => {
    const { error } = await supabase.from('portal_idea_council_items')
      .insert({ round_id: rid, idea_id: ideaId, idea_code: ideaCode.trim(), proposed_tier: capXet });
    if (error) {
      toast.error(`Không thêm được ý tưởng vào đợt: ${error.message}`);
      return false;
    }
    toast.success('Đã trình ý tưởng lên Hội đồng');
    refresh();
    return true;
  }, [refresh]);

  /** Rút ý tưởng khỏi đợt — phải có lý do; chủ ý tưởng được báo (16/09/2026) */
  const rutYTuong = useCallback(async (itemId: string, lyDo: string): Promise<boolean> => {
    const { error } = await supabase.rpc('bhy_ideas_hd_rut_y_tuong', { _item_id: itemId, _ly_do: lyDo });
    if (error) {
      toast.error(`Không rút được: ${error.message}`);
      return false;
    }
    toast.success('Đã rút ý tưởng khỏi đợt và báo cho chủ ý tưởng');
    refresh();
    return true;
  }, [refresh]);

  // ---- Điểm danh: vắng cả đợt (phienId null) hoặc vắng một phiên ----

  const ghiVang = useCallback(async (
    rid: string, profileId: string, phienId: string | null, lyDo: string,
  ): Promise<boolean> => {
    const { error } = await supabase.from('portal_idea_council_vang')
      .insert({ round_id: rid, phien_id: phienId, profile_id: profileId, ly_do: lyDo.trim() || null });
    if (error) {
      toast.error(`Không ghi được vắng: ${error.message}`);
      return false;
    }
    refresh();
    return true;
  }, [refresh]);

  const boVang = useCallback(async (id: string) => {
    const { error } = await supabase.from('portal_idea_council_vang').delete().eq('id', id);
    if (error) {
      toast.error(`Không bỏ được đánh dấu vắng: ${error.message}`);
      return;
    }
    refresh();
  }, [refresh]);

  /** Nhắc PUSH các thành viên còn thiếu phiếu (không email — chốt 08/2026) */
  const nhacPush = useCallback(async (rid: string, profileIds?: string[]): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('notify-idea-council', {
      body: { round_id: rid, profile_ids: profileIds, dry_run: false },
    });
    if (error) {
      toast.error(`Không gửi được nhắc: ${error.message}`);
      return;
    }
    const results = (data?.results ?? []) as Array<{ name: string; devices: number; sent: number }>;
    const sent = results.filter(r => r.sent > 0).length;
    const noDevice = results.filter(r => r.devices === 0).map(r => r.name);
    if (results.length === 0) toast.info('Không còn ai thiếu phiếu để nhắc');
    else if (noDevice.length > 0) {
      toast.warning(`Đã nhắc ${sent}/${results.length} người. Chưa bật thông báo trên thiết bị: ${noDevice.join(', ')}`);
    } else {
      toast.success(`Đã gửi nhắc push tới ${sent}/${results.length} người còn thiếu phiếu`);
    }
    refresh();
  }, [refresh]);

  // ---- Phiên trình bày (TCTH) ----

  const taoPhien = useCallback(async (rid: string, ten: string, thuTu: number): Promise<boolean> => {
    const { error } = await supabase.from('portal_idea_council_sessions')
      .insert({ round_id: rid, ten: ten.trim(), thu_tu: thuTu });
    if (error) {
      toast.error(`Không tạo được phiên trình bày: ${error.message}`);
      return false;
    }
    toast.success('Đã tạo phiên trình bày');
    refresh();
    return true;
  }, [refresh]);

  const suaPhien = useCallback(async (
    id: string, patch: { ten?: string; thuTu?: number; ghiChu?: string },
  ) => {
    const { error } = await supabase.from('portal_idea_council_sessions')
      .update({
        ...(patch.ten !== undefined ? { ten: patch.ten.trim() } : {}),
        ...(patch.thuTu !== undefined ? { thu_tu: patch.thuTu } : {}),
        ...(patch.ghiChu !== undefined ? { ghi_chu: patch.ghiChu.trim() || null } : {}),
      })
      .eq('id', id);
    if (error) {
      toast.error(`Không sửa được phiên: ${error.message}`);
      return;
    }
    refresh();
  }, [refresh]);

  /**
   * Xóa phiên KHÔNG xóa ý tưởng khỏi đợt và KHÔNG xóa phiếu đã chấm — khóa
   * ngoại để ON DELETE SET NULL, ý tưởng quay về nhóm «chưa xếp phiên».
   */
  const xoaPhien = useCallback(async (id: string) => {
    const { error } = await supabase.from('portal_idea_council_sessions').delete().eq('id', id);
    if (error) {
      toast.error(`Không xóa được phiên: ${error.message}`);
      return;
    }
    toast.success('Đã xóa phiên — ý tưởng quay về nhóm chưa xếp phiên, phiếu đã chấm giữ nguyên');
    refresh();
  }, [refresh]);

  const xepVaoPhien = useCallback(async (itemId: string, phienId: string | null) => {
    const { error } = await supabase.from('portal_idea_council_items')
      .update({ phien_id: phienId }).eq('id', itemId);
    if (error) {
      toast.error(`Không xếp được vào phiên: ${error.message}`);
      return;
    }
    refresh();
  }, [refresh]);

  /** Bắt đầu trình bày — RPC tự đóng phiên đang chạy trong cùng một giao dịch */
  const moPhien = useCallback(async (phienId: string) => {
    const { error } = await supabase.rpc('bhy_ideas_hd_mo_phien', { _phien_id: phienId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Đã bắt đầu phiên — màn chấm của Hội đồng tự thu về phiên này');
    refresh();
  }, [refresh]);

  const dongPhien = useCallback(async (phienId: string) => {
    const { error } = await supabase.rpc('bhy_ideas_hd_dong_phien', { _phien_id: phienId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Đã kết thúc phiên trình bày');
    refresh();
  }, [refresh]);

  return {
    guiPhieu, taoDot, doiTrangThaiDot, datHanChot, congBoKetQua,
    themYTuong, rutYTuong, nhacPush,
    taoPhien, suaPhien, xoaPhien, xepVaoPhien, moPhien, dongPhien,
    ghiVang, boVang,
  };
}

/**
 * Phiên trình bày của một đợt.
 *
 * `live` = đợt đang mở: tự đọc lại mỗi 15 giây. Đây là mấu chốt của kịch bản
 * họp — TCTH bấm «Bắt đầu trình bày» ở máy chiếu thì trong vòng 15 giây màn
 * chấm trên điện thoại của từng thành viên tự thu về đúng nhóm ý tưởng đang
 * nghe, không ai phải bấm gì.
 */
export function usePhienTrinhBay(roundId: string | null, enabled: boolean, live = false) {
  const { data: phien = [], isLoading } = useQuery({
    queryKey: phienKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    refetchInterval: live ? 15_000 : false,
    queryFn: async (): Promise<PhienTrinhBay[]> => {
      const { data, error } = await supabase
        .from('portal_idea_council_sessions')
        .select('*')
        .eq('round_id', roundId!)
        .order('thu_tu', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(p => ({
        id: p.id,
        roundId: p.round_id,
        ten: p.ten,
        thuTu: p.thu_tu,
        trangThai: p.trang_thai as TrangThaiPhien,
        batDauLuc: p.bat_dau_luc,
        ketThucLuc: p.ket_thuc_luc,
        ghiChu: p.ghi_chu,
      }));
    },
  });
  return { phien, isLoading };
}

// ---- Thành viên Hội đồng (bảng — GĐ quyết định từng thời kỳ, TCTH thao tác) ----

export interface CouncilMember {
  id: string;
  profileId: string;
  fullName: string;
  position: string;
  isChair: boolean;
  isActive: boolean;
  note: string | null;
}

export function useCouncilMembers(enabled: boolean) {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: MEMBERS_KEY,
    enabled,
    queryFn: async (): Promise<CouncilMember[]> => {
      const { data, error } = await supabase
        .from('portal_idea_council_members')
        .select('id, profile_id, is_chair, is_active, note, profiles(full_name, position)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(m => {
        const p = m.profiles as unknown as { full_name: string | null; position: string | null } | null;
        return {
          id: m.id,
          profileId: m.profile_id,
          fullName: p?.full_name ?? 'Không rõ tên',
          position: p?.position ?? '',
          isChair: m.is_chair,
          isActive: m.is_active,
          note: m.note,
        };
      });
    },
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
    [queryClient],
  );

  const themThanhVien = useCallback(async (profileId: string, note: string) => {
    const { error } = await supabase.from('portal_idea_council_members')
      .insert({ profile_id: profileId, note: note.trim() || null });
    if (error) {
      toast.error(`Không thêm được thành viên: ${error.message}`);
      return;
    }
    toast.success('Đã thêm thành viên Hội đồng');
    refresh();
  }, [refresh]);

  const capNhatThanhVien = useCallback(async (
    id: string,
    patch: { isChair?: boolean; isActive?: boolean; note?: string },
  ) => {
    const { error } = await supabase.from('portal_idea_council_members')
      .update({
        ...(patch.isChair !== undefined ? { is_chair: patch.isChair } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        ...(patch.note !== undefined ? { note: patch.note.trim() || null } : {}),
      })
      .eq('id', id);
    if (error) {
      toast.error(`Không cập nhật được: ${error.message}`);
      return;
    }
    refresh();
  }, [refresh]);

  const xoaThanhVien = useCallback(async (id: string) => {
    const { error } = await supabase.from('portal_idea_council_members')
      .delete().eq('id', id);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã xóa thành viên khỏi Hội đồng');
    refresh();
  }, [refresh]);

  return { members, isLoading, themThanhVien, capNhatThanhVien, xoaThanhVien };
}

/** Hồ sơ đang hoạt động để chọn thêm vào Hội đồng — chỉ tải cho admin */
export function useActiveProfiles(enabled: boolean) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['idea-council-active-profiles'],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, position')
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  return { profiles, isLoading };
}

// ---- Tiến độ đôn đốc (TCTH + Chủ tịch): tên thật, KHÔNG điểm ----

export interface TienDoThanhVien {
  profileId: string;
  fullName: string;
  isChair: boolean;
  /** Số ý tưởng phải chấm (đã trừ tự chấm, cùng/liên phòng, và vắng có phép) */
  expected: number;
  /** Số ý tưởng không được chấm vì tự đề xuất / cùng phòng / liên phòng */
  khongCham: number;
  /** Số ý tưởng được miễn vì vắng có phép (điểm danh) */
  vang: number;
  submitted: number;
  draft: number;
  pendingCodes: string[];
}

export function useCouncilProgress(roundId: string | null, enabled: boolean, live = false) {
  const { data, isLoading, error } = useQuery({
    queryKey: progressKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    retry: false,
    // Kịch bản họp tại chỗ: TCTH trình chiếu bảng tiến độ, phiếu đổ về liên
    // tục — tự làm mới khi đợt đang mở để khỏi bấm tay
    refetchInterval: live ? 15_000 : false,
    queryFn: async () => {
      const { data: payload, error: rpcError } = await supabase
        .rpc('bhy_ideas_hd_tien_do', { _round_id: roundId! });
      if (rpcError) throw rpcError;
      const raw = payload as {
        total_items: number;
        members: Array<{
          profile_id: string; full_name: string; is_chair: boolean;
          expected: number; khong_cham?: number; vang?: number;
          submitted: number; draft: number; pending_codes: string[];
        }>;
      };
      return {
        totalItems: raw.total_items ?? 0,
        members: (raw.members ?? []).map((m): TienDoThanhVien => ({
          profileId: m.profile_id,
          fullName: m.full_name,
          isChair: m.is_chair,
          expected: m.expected,
          khongCham: m.khong_cham ?? 0,
          vang: m.vang ?? 0,
          submitted: m.submitted,
          draft: m.draft,
          pendingCodes: m.pending_codes ?? [],
        })),
      };
    },
  });
  return { progress: data ?? null, isLoading, error: error as Error | null };
}

/** Phiếu ẩn danh của một đợt cho khung quản trị TCTH — nhóm theo ý tưởng */
export function useAnonBallots(roundId: string | null, enabled: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: ballotsKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    retry: false,
    queryFn: async (): Promise<Record<string, AnonBallot[]>> => {
      const { data: payload, error: rpcError } = await supabase
        .rpc('bhy_ideas_hd_phieu_an_danh', { _round_id: roundId! });
      if (rpcError) throw rpcError;
      const rows = (payload ?? []) as Array<{
        vote_id: string; item_id: string; conflict_status: string;
        score_problem: number; score_impact: number; score_feasible: number;
        score_safety: number; score_scale: number;
        recommendation: string; gop_y: string | null; ly_do_loai?: string | null;
      }>;
      const byItem: Record<string, AnonBallot[]> = {};
      for (const r of rows) {
        (byItem[r.item_id] ??= []).push({
          voteId: r.vote_id,
          itemId: r.item_id,
          xungDot: r.conflict_status as XungDotLoiIch,
          diem: {
            problem: r.score_problem,
            impact: r.score_impact,
            feasible: r.score_feasible,
            safety: r.score_safety,
            scale: r.score_scale,
          },
          deXuat: r.recommendation as DeXuatHoiDong,
          gopY: r.gop_y,
          lyDoLoai: (r.ly_do_loai as LyDoKhongCham | null) ?? null,
        });
      }
      return byItem;
    },
  });
  return { ballotsByItem: data ?? {}, isLoading, error: error as Error | null };
}

/** Bản tổng hợp Phụ lục 07 từ RPC — Chủ tịch/System xem mọi lúc, còn lại sau công bố */
export function useCouncilSummary(roundId: string | null, enabled: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: summaryKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    retry: false,
    queryFn: async () => {
      const { data: payload, error: rpcError } = await supabase
        .rpc('bhy_ideas_hd_tong_hop', { _round_id: roundId! });
      if (rpcError) throw rpcError;
      return docTongHopRpc(payload);
    },
  });
  return { summary: data ?? null, isLoading, error: error as Error | null };
}

export interface UngVienHoiDong {
  ideaId: string;
  title: string;
  departmentName: string;
  proposer: string;
  developmentLevel: string;
  /** Đợt Lan tỏa: ngày được công nhận Vươn cành và ngày đủ điều kiện (sau 30 ngày) */
  congNhanVcLuc: string | null;
  duDieuKienTu: string | null;
  duDieuKien: boolean;
  lyDo: string | null;
}

/**
 * Ứng viên trình vào một đợt — theo cấp xét của đợt (RPC bhy_ideas_hd_ung_vien):
 * đợt Vươn cành lấy ý tưởng đã bật cờ Hội đồng chưa lên cấp; đợt Lan tỏa lấy
 * ý tưởng ĐÃ Vươn cành kèm cờ đủ/chưa đủ 30 ngày để TCTH thấy còn bao lâu.
 */
export function useUngVien(roundId: string | null, enabled: boolean) {
  const { data: ungVien = [], isLoading } = useQuery({
    queryKey: ungVienKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    queryFn: async (): Promise<UngVienHoiDong[]> => {
      const { data, error } = await supabase.rpc('bhy_ideas_hd_ung_vien', { _round_id: roundId! });
      if (error) throw error;
      return (data ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        departmentName: r.department_name,
        proposer: r.proposer,
        developmentLevel: r.development_level,
        congNhanVcLuc: r.cong_nhan_vc_luc,
        duDieuKienTu: r.du_dieu_kien_tu,
        duDieuKien: r.du_dieu_kien,
        lyDo: r.ly_do,
      }));
    },
  });
  return { ungVien, isLoading };
}

/**
 * Với đợt này, tôi KHÔNG được chấm ý tưởng nào và vì sao — máy chủ quyết theo
 * danh bạ (tự đề xuất, cùng phòng, liên phòng). Giao diện chỉ hiển thị; RLS
 * mới là hàng rào thật.
 */
export function useToiDuocCham(roundId: string | null, enabled: boolean) {
  const { data } = useQuery({
    queryKey: duocChamKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    queryFn: async (): Promise<Map<string, LyDoKhongCham>> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_hd_toi_duoc_cham', { _round_id: roundId! });
      if (error) throw error;
      const m = new Map<string, LyDoKhongCham>();
      for (const r of rows ?? []) if (r.ly_do) m.set(r.item_id, r.ly_do as LyDoKhongCham);
      return m;
    },
  });
  return { lyDoKhongCham: data ?? new Map<string, LyDoKhongCham>() };
}

export interface DongVang {
  id: string;
  roundId: string;
  /** null = vắng cả đợt */
  phienId: string | null;
  profileId: string;
  lyDo: string | null;
}

/** Điểm danh của một đợt — ai vắng cả đợt, ai vắng phiên nào */
export function useDiemDanh(roundId: string | null, enabled: boolean) {
  const { data: vang = [], isLoading } = useQuery({
    queryKey: vangKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    queryFn: async (): Promise<DongVang[]> => {
      const { data, error } = await supabase
        .from('portal_idea_council_vang')
        .select('id, round_id, phien_id, profile_id, ly_do')
        .eq('round_id', roundId!);
      if (error) throw error;
      return (data ?? []).map(v => ({
        id: v.id, roundId: v.round_id, phienId: v.phien_id, profileId: v.profile_id, lyDo: v.ly_do,
      }));
    },
  });
  return { vang, isLoading };
}

// ---- Ý kiến Hội đồng cho người NGOÀI Hội đồng (16/09/2026) ----

export type VaiDocYKien = 'chu_y_tuong' | 'tcth' | 'ban_giam_doc' | 'lanh_dao_phong';

export interface YKienHoiDongYTuong {
  ideaId: string;
  roundId: string;
  roundName: string;
  capXet: CapXet;
  congBoLuc: string | null;
  /** 'vuon_canh' | 'lan_toa' | null (chưa đạt) — đúng cái đã ghi sổ */
  ketLuan: 'vuon_canh' | 'lan_toa' | null;
  diemTbChung: number | null;
  soPhieu: number;
  tongThanhVien: number;
  soDongY: number;
  soKhongXet: number;
  soCanBoSung: number;
  /** Góp ý D2 ẩn danh — không tên, không mốc giờ */
  gopY: string[];
  vai: VaiDocYKien | null;
}

const yKienKey = ['idea-council-y-kien-cua-toi'];

/**
 * Chủ ý tưởng, lãnh đạo phòng có ý tưởng, Ban Giám đốc, TCTH đọc được góp ý của
 * Hội đồng cho ý tưởng — ẩn danh, chỉ đợt đã công bố. Ai được xem gì do RPC
 * quyết theo danh bạ; client chỉ ghép vào thẻ ý tưởng.
 */
export function useYKienHoiDongCuaToi(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: yKienKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<YKienHoiDongYTuong[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_hd_y_kien_hoi_dong');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        roundId: r.round_id,
        roundName: r.round_name,
        capXet: (r.cap_xet === 'Lan tỏa' ? 'Lan tỏa' : 'Vươn cành') as CapXet,
        congBoLuc: r.cong_bo_luc,
        ketLuan: r.ket_luan === 'vuon_canh' || r.ket_luan === 'lan_toa' ? r.ket_luan : null,
        diemTbChung: typeof r.avg_overall === 'number' ? r.avg_overall : r.avg_overall == null ? null : Number(r.avg_overall),
        soPhieu: r.total_votes,
        tongThanhVien: r.eligible_members,
        soDongY: r.agree,
        soKhongXet: r.rec_khong_xet,
        soCanBoSung: r.rec_can_bo_sung,
        gopY: Array.isArray(r.gop_y) ? (r.gop_y as unknown[]).filter((g): g is string => typeof g === 'string') : [],
        vai: (r.vai as VaiDocYKien | null) ?? null,
      }));
    },
  });
  const theoIdea: Record<string, YKienHoiDongYTuong[]> = {};
  for (const y of data) (theoIdea[y.ideaId] ??= []).push(y);
  return { yKien: data, theoIdea, isLoading };
}
