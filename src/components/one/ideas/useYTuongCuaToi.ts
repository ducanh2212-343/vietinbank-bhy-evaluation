import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { demTheoCap, docCapDo, docVaiTro, type YTuongCuaToi } from '@/lib/yTuongCuaToi';

export const yTuongCuaToiKey = ['bhy-ideas-y-tuong-cua-toi'];

/**
 * Ý tưởng của người đang đăng nhập (tự tạo hoặc có tên đồng đề xuất) kèm cấp
 * độ hiện tại. Máy chủ quyết «của tôi» theo cùng luật khớp tên với Hội đồng —
 * client không tự so tên để khỏi có hai luật.
 */
export function useYTuongCuaToi(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: yTuongCuaToiKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<YTuongCuaToi[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_y_tuong_cua_toi');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        ideaId: r.idea_id,
        title: r.title,
        capDo: docCapDo(r.development_level),
        vai: docVaiTro(r.vai),
        congNhanLuc: r.cong_nhan_luc ?? null,
        thuongLuyKe: r.thuong_luy_ke ?? 0,
      }));
    },
  });
  const theoIdea = Object.fromEntries(data.map(y => [y.ideaId, y])) as Record<string, YTuongCuaToi>;
  return { yTuong: data, theoIdea, dem: demTheoCap(data), isLoading };
}
