import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  docTongHopRpc,
  type DeXuatHoiDong,
  type TangDeXuat,
  type TieuChiKey,
  type TrangThaiDot,
  type XungDotLoiIch,
} from '@/lib/ideaCouncil';

// Dữ liệu Chấm điểm Hội đồng BHY Ideas — 3 bảng portal_idea_council_* +
// RPC tổng hợp. Phân quyền phản chiếu đúng backend (bhy_ideas_hd_la_thanh_vien
// và is_content_admin) — RLS mới là lớp chặn thật, hook chỉ để dựng UI.

/** Vai trò thuộc Hội đồng theo quy chế — đối xứng hàm SQL bhy_ideas_hd_la_thanh_vien */
const VAI_TRO_HOI_DONG = ['bgd', 'pgd', 'manager', 'tcth_admin', 'system_admin'] as const;

export function useIdeaCouncilAccess() {
  const { roles, loading } = useAuth();
  const isMember = roles.some(r => (VAI_TRO_HOI_DONG as readonly string[]).includes(r));
  /** Vận hành đợt chấm + tổng hợp ẩn danh (Admin TCTH / System Admin) */
  const isAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');
  /** Duy nhất được xem phiếu ĐỊNH DANH (ẩn danh cả với TCTH/BGĐ — chốt 08/2026) */
  const isSystemAdmin = roles.includes('system_admin');
  return { loading, isMember, isAdmin, isSystemAdmin };
}

export interface CouncilRound {
  id: string;
  name: string;
  status: TrangThaiDot;
  note: string | null;
  createdAt: string;
}

export interface CouncilVote {
  id: string;
  itemId: string;
  userId: string;
  xungDot: XungDotLoiIch;
  diem: Record<TieuChiKey, number>;
  deXuat: DeXuatHoiDong;
  gopY: string | null;
  updatedAt: string;
}

export interface CouncilItem {
  id: string;
  roundId: string;
  ideaCode: string;
  proposedTier: TangDeXuat;
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
}

const ROUNDS_KEY = ['idea-council-rounds'];
const itemsKey = (roundId: string) => ['idea-council-items', roundId];
const summaryKey = (roundId: string) => ['idea-council-summary', roundId];
const ballotsKey = (roundId: string) => ['idea-council-anon-ballots', roundId];

type VoteRow = {
  id: string;
  item_id: string;
  user_id: string;
  conflict_status: string;
  score_problem: number;
  score_impact: number;
  score_feasible: number;
  score_safety: number;
  score_scale: number;
  recommendation: string;
  gop_y: string | null;
  updated_at: string;
};

const mapVote = (v: VoteRow): CouncilVote => ({
  id: v.id,
  itemId: v.item_id,
  userId: v.user_id,
  xungDot: v.conflict_status as XungDotLoiIch,
  diem: {
    problem: v.score_problem,
    impact: v.score_impact,
    feasible: v.score_feasible,
    safety: v.score_safety,
    scale: v.score_scale,
  },
  deXuat: v.recommendation as DeXuatHoiDong,
  gopY: v.gop_y,
  updatedAt: v.updated_at,
});

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
        note: r.note,
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
        .select('id, round_id, idea_code, proposed_tier, portal_ideas(id, title, department_name, level, proposer, current_status, proposed_solution, expected_benefits, development_level, has_demo)')
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
          development_level: string; has_demo: boolean;
        };
        const itemVotes = votes.filter(v => v.item_id === r.id).map(mapVote);
        return {
          id: r.id,
          roundId: r.round_id,
          ideaCode: r.idea_code,
          proposedTier: r.proposed_tier as TangDeXuat,
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
          },
          myVote: itemVotes.find(v => v.userId === user?.id) ?? null,
          votes: itemVotes,
        };
      });
    },
  });
  return { items, isLoading };
}

export interface PhieuGui {
  xungDot: XungDotLoiIch;
  diem: Record<TieuChiKey, number>;
  deXuat: DeXuatHoiDong;
  gopY: string;
}

export function useCouncilMutations(roundId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ROUNDS_KEY });
    if (roundId) {
      queryClient.invalidateQueries({ queryKey: itemsKey(roundId) });
      queryClient.invalidateQueries({ queryKey: summaryKey(roundId) });
      queryClient.invalidateQueries({ queryKey: ballotsKey(roundId) });
    }
  }, [queryClient, roundId]);

  /** Gửi/sửa phiếu chấm của chính mình (upsert theo item_id + user_id) */
  const guiPhieu = useCallback(async (itemId: string, phieu: PhieuGui): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from('portal_idea_council_votes').upsert({
      item_id: itemId,
      user_id: user.id,
      conflict_status: phieu.xungDot,
      score_problem: phieu.diem.problem,
      score_impact: phieu.diem.impact,
      score_feasible: phieu.diem.feasible,
      score_safety: phieu.diem.safety,
      score_scale: phieu.diem.scale,
      recommendation: phieu.deXuat,
      gop_y: phieu.gopY.trim() || null,
    }, { onConflict: 'item_id,user_id' });
    if (error) {
      toast.error(`Không gửi được phiếu chấm: ${error.message}`);
      return false;
    }
    toast.success('Đã ghi nhận phiếu chấm của bạn');
    refresh();
    return true;
  }, [user, refresh]);

  // ---- Quản trị (TCTH/System) — RLS chặn nếu thiếu quyền ----

  const taoDot = useCallback(async (name: string, note: string): Promise<boolean> => {
    const { error } = await supabase.from('portal_idea_council_rounds')
      .insert({ name: name.trim(), note: note.trim() || null });
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

  const themYTuong = useCallback(async (
    rid: string, ideaId: string, ideaCode: string, tier: TangDeXuat,
  ): Promise<boolean> => {
    const { error } = await supabase.from('portal_idea_council_items')
      .insert({ round_id: rid, idea_id: ideaId, idea_code: ideaCode.trim(), proposed_tier: tier });
    if (error) {
      toast.error(`Không thêm được ý tưởng vào đợt: ${error.message}`);
      return false;
    }
    toast.success('Đã trình ý tưởng lên Hội đồng');
    refresh();
    return true;
  }, [refresh]);

  const goYTuong = useCallback(async (itemId: string) => {
    const { error } = await supabase.from('portal_idea_council_items')
      .delete().eq('id', itemId);
    if (error) {
      toast.error(`Không gỡ được: ${error.message}`);
      return;
    }
    toast.success('Đã gỡ ý tưởng khỏi đợt chấm');
    refresh();
  }, [refresh]);

  return { guiPhieu, taoDot, doiTrangThaiDot, themYTuong, goYTuong };
}

/** Phiếu ẩn danh của một đợt cho khung quản trị TCTH — nhóm theo ý tưởng */
export function useAnonBallots(roundId: string | null, enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: ballotsKey(roundId ?? 'none'),
    enabled: enabled && !!roundId,
    queryFn: async (): Promise<Record<string, AnonBallot[]>> => {
      const { data: payload, error } = await supabase
        .rpc('bhy_ideas_hd_phieu_an_danh', { _round_id: roundId! });
      if (error) throw error;
      const rows = (payload ?? []) as Array<{
        vote_id: string; item_id: string; conflict_status: string;
        score_problem: number; score_impact: number; score_feasible: number;
        score_safety: number; score_scale: number;
        recommendation: string; gop_y: string | null;
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
        });
      }
      return byItem;
    },
  });
  return { ballotsByItem: data ?? {}, isLoading };
}

/** Bản tổng hợp Phụ lục 07 từ RPC — admin xem mọi lúc, thành viên sau khi chốt */
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

/** Ý tưởng đủ điều kiện trình Hội đồng (đã bật cờ Đề xuất Hội đồng) — cho khung quản trị */
export function useCouncilCandidates(enabled: boolean) {
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['idea-council-candidates'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_ideas')
        .select('id, title, department_name, level, development_level, proposer')
        .eq('council_proposal', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return { candidates, isLoading };
}
