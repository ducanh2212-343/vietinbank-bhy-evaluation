import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Cờ bật/tắt tác vụ AI theo bảng ai_prompts (admin chỉnh tại trang Quản trị AI).
 * Quy ước khớp với edge function ai-advisor: chỉ chặn khi is_active === false;
 * thiếu dòng cấu hình hoặc đang tải → coi như đang bật (fail-open) để không
 * vô hiệu hoá AI oan khi truy vấn cờ gặp lỗi mạng.
 */
export function useAiFeatures() {
  const { data } = useQuery({
    queryKey: ['ai-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_prompts').select('mode, is_active');
      if (error) throw error;
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) map[row.mode] = row.is_active !== false;
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isEnabled = (mode: string) => data?.[mode] !== false;
  return { isEnabled };
}
