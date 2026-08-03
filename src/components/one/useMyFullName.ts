import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Họ tên cán bộ đang đăng nhập (profiles.full_name) — dùng để tự điền
// trường "tác giả"/"người tạo" trong UploadModal và Credit 360.
export function useMyFullName(): string {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['one-my-full-name', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string> => {
      const { data: row } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return row?.full_name ?? '';
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? '';
}
