import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { docTongHopTheDiem, type TongHopTheDiem } from '@/lib/ideaTheDiem';

export const tongHopTheDiemKey = ['bhy-ideas-tong-hop-the-diem'];

/** Nguyên liệu Thẻ điểm ĐMST toàn chi nhánh — máy chủ chỉ mở cho TCTH và Ban Giám đốc */
export function useTongHopTheDiem(enabled = true) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: tongHopTheDiemKey,
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TongHopTheDiem> => {
      const { data: json, error: loi } = await supabase.rpc('bhy_ideas_tong_hop_the_diem');
      if (loi) throw loi;
      return docTongHopTheDiem(json);
    },
  });
  return { tongHop: data ?? null, isLoading, isFetching, error: error as Error | null, refetch };
}
