import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { IdeaApplicability, IdeaDevLevel, IdeaLevel } from '@/data/one/ideasConfig';

// BHY Ideas — bảng portal_ideas + portal_idea_votes + portal_idea_comments.
// Tổng thích/không thích = seed (mang từ Firebase) + đếm bảng votes.

export interface PortalIdea {
  id: string;
  level: IdeaLevel;
  applicability: IdeaApplicability;
  title: string;
  currentStatus: string;
  proposedSolution: string;
  expectedBenefits: string;
  departmentName: string;
  hasDemo: boolean;
  proposer: string;
  developmentLevel: IdeaDevLevel;
  councilProposal: boolean;
  customValues: Record<string, unknown> | null;
  likes: number;
  unlikes: number;
  /** 1 = tôi đã thích, -1 = tôi đã không thích, null = chưa vote */
  myVote: 1 | -1 | null;
  commentCount: number;
  createdAt: string;
  /** Lần sửa gần nhất (đổi cấp độ, cờ Hội đồng…) — dùng cho báo cáo KPI theo kỳ */
  updatedAt: string;
  createdBy: string;
  /** Email tài khoản đã gửi phiếu — chỉ dùng trong file kết xuất của quản trị */
  creatorEmail: string | null;
  isMine: boolean;
}

export interface IdeaInput {
  level: IdeaLevel;
  applicability: IdeaApplicability;
  title: string;
  currentStatus: string;
  proposedSolution: string;
  expectedBenefits: string;
  departmentName: string;
  hasDemo: boolean;
  proposer: string;
  /** Chủ sở hữu phiếu — quản trị nhập hộ thì gán về đúng cán bộ đề xuất, mặc định là chính mình */
  createdBy?: string;
}

export interface IdeaComment {
  id: string;
  userName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
}

const IDEAS_KEY = ['one-portal-ideas'];

// Supabase cắt mỗi truy vấn ở 1000 dòng mặc định và KHÔNG báo lỗi — bảng vote/
// bình luận vượt mức này khi ~100 cán bộ tương tác vài trăm ý tưởng, số thích
// sẽ đếm thiếu âm thầm. Tải theo trang tới khi hết dữ liệu.
async function taiHetTrang<T>(
  taiTrang: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const CO_TRANG = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += CO_TRANG) {
    const { data, error } = await taiTrang(from, from + CO_TRANG - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < CO_TRANG) return rows;
  }
}

export function usePortalIdeas() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const isContentAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: IDEAS_KEY,
    queryFn: async (): Promise<PortalIdea[]> => {
      const [rows, votes, comments] = await Promise.all([
        taiHetTrang((from, to) =>
          supabase.from('portal_ideas').select('*')
            .order('created_at', { ascending: false }).range(from, to)),
        taiHetTrang((from, to) =>
          supabase.from('portal_idea_votes').select('idea_id, user_id, vote')
            .order('created_at', { ascending: true }).range(from, to)),
        taiHetTrang((from, to) =>
          supabase.from('portal_idea_comments').select('id, idea_id')
            .order('created_at', { ascending: true }).range(from, to)),
      ]);

      const likeCount = new Map<string, number>();
      const unlikeCount = new Map<string, number>();
      const myVotes = new Map<string, 1 | -1>();
      for (const v of votes) {
        const m = v.vote === 1 ? likeCount : unlikeCount;
        m.set(v.idea_id, (m.get(v.idea_id) ?? 0) + 1);
        if (v.user_id === user?.id) myVotes.set(v.idea_id, v.vote as 1 | -1);
      }
      const commentCount = new Map<string, number>();
      for (const c of comments) {
        commentCount.set(c.idea_id, (commentCount.get(c.idea_id) ?? 0) + 1);
      }

      return rows.map(r => ({
        id: r.id,
        level: r.level as IdeaLevel,
        applicability: r.applicability as IdeaApplicability,
        title: r.title,
        currentStatus: r.current_status ?? '',
        proposedSolution: r.proposed_solution ?? '',
        expectedBenefits: r.expected_benefits ?? '',
        departmentName: r.department_name,
        hasDemo: r.has_demo,
        proposer: r.proposer,
        developmentLevel: r.development_level as IdeaDevLevel,
        councilProposal: r.council_proposal,
        customValues: (r.custom_values as Record<string, unknown> | null) ?? null,
        likes: (r.seed_likes ?? 0) + (likeCount.get(r.id) ?? 0),
        unlikes: (r.seed_unlikes ?? 0) + (unlikeCount.get(r.id) ?? 0),
        myVote: myVotes.get(r.id) ?? null,
        commentCount: commentCount.get(r.id) ?? 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        createdBy: r.created_by,
        creatorEmail: r.creator_email ?? null,
        isMine: r.created_by === user?.id,
      }));
    },
    staleTime: 30 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: IDEAS_KEY }),
    [queryClient],
  );

  const createIdea = useCallback(async (input: IdeaInput): Promise<boolean> => {
    const { error } = await supabase.from('portal_ideas').insert({
      level: input.level,
      applicability: input.applicability,
      title: input.title.trim(),
      current_status: input.currentStatus.trim(),
      proposed_solution: input.proposedSolution.trim(),
      expected_benefits: input.expectedBenefits.trim(),
      department_name: input.departmentName,
      has_demo: input.hasDemo,
      proposer: input.proposer.trim(),
      created_by: input.createdBy ?? user?.id,
      creator_email: user?.email ?? null,
    });
    if (error) {
      toast.error(`Không gửi được ý tưởng: ${error.message}`);
      return false;
    }
    toast.success('Đã gửi ý tưởng sáng kiến lên hệ thống!');
    refresh();
    return true;
  }, [user, refresh]);

  const updateIdea = useCallback(async (id: string, input: IdeaInput): Promise<boolean> => {
    const { error } = await supabase.from('portal_ideas').update({
      level: input.level,
      applicability: input.applicability,
      title: input.title.trim(),
      current_status: input.currentStatus.trim(),
      proposed_solution: input.proposedSolution.trim(),
      expected_benefits: input.expectedBenefits.trim(),
      department_name: input.departmentName,
      has_demo: input.hasDemo,
      proposer: input.proposer.trim(),
    }).eq('id', id);
    if (error) {
      toast.error(`Không cập nhật được ý tưởng: ${error.message}`);
      return false;
    }
    toast.success('Đã cập nhật ý tưởng');
    refresh();
    return true;
  }, [refresh]);

  const deleteIdea = useCallback(async (id: string) => {
    const { error } = await supabase.from('portal_ideas').delete().eq('id', id);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã xóa ý tưởng');
    refresh();
  }, [refresh]);

  // Bấm lại nút đang chọn = bỏ vote; bấm nút kia = đổi vote
  const setVote = useCallback(async (ideaId: string, next: 1 | -1 | null) => {
    if (!user) return;
    let error;
    if (next === null) {
      ({ error } = await supabase.from('portal_idea_votes')
        .delete().eq('idea_id', ideaId).eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('portal_idea_votes')
        .upsert({ idea_id: ideaId, user_id: user.id, vote: next }, { onConflict: 'idea_id,user_id' }));
    }
    if (error) {
      toast.error('Không gửi được bình chọn');
      return;
    }
    refresh();
  }, [user, refresh]);

  const adminUpdateStatus = useCallback(async (
    ideaId: string,
    patch: { developmentLevel?: IdeaDevLevel; departmentName?: string; councilProposal?: boolean },
  ) => {
    const { error } = await supabase.rpc('admin_update_idea_status', {
      _idea_id: ideaId,
      _development_level: patch.developmentLevel,
      _department_name: patch.departmentName,
      _council_proposal: patch.councilProposal,
    });
    if (error) {
      toast.error(`Không cập nhật được: ${error.message}`);
      return;
    }
    toast.success('Đã cập nhật trạng thái');
    refresh();
  }, [refresh]);

  return { ideas, isLoading, isContentAdmin, createIdea, updateIdea, deleteIdea, setVote, adminUpdateStatus };
}

// Bình luận của một ý tưởng — chỉ tải khi mở khối bình luận
export function useIdeaComments(ideaId: string, enabled: boolean) {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const isContentAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');
  const key = ['one-idea-comments', ideaId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<IdeaComment[]> => {
      const { data, error } = await supabase
        .from('portal_idea_comments')
        .select('id, user_id, user_name, body, created_at')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: c.id,
        userName: c.user_name,
        body: c.body,
        createdAt: c.created_at,
        isMine: c.user_id === user?.id,
      }));
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: IDEAS_KEY });
  };

  const addComment = async (body: string, userName: string) => {
    if (!body.trim()) return;
    // Gửi kèm user_id tường minh: policy "Staff can comment as themselves" đòi
    // user_id = auth.uid(), thiếu nó là RLS chặn phiếu (bản trước dựa vào DEFAULT
    // của cột — vốn không tồn tại cho tới migration 20260924).
    const { error } = await supabase.from('portal_idea_comments').insert({
      idea_id: ideaId,
      user_id: user?.id,
      user_name: userName,
      body: body.trim(),
    });
    if (error) {
      toast.error('Không gửi được bình luận');
      return;
    }
    refresh();
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from('portal_idea_comments').delete().eq('id', commentId);
    if (error) {
      toast.error('Không xóa được bình luận');
      return;
    }
    refresh();
  };

  return { comments, isLoading, isContentAdmin, addComment, deleteComment };
}
