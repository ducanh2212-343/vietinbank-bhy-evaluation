import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UploadedItem, ProgramCategory } from '@/data/one/types';
import { signOnePaths, uploadOneImage } from '@/lib/oneStorage';

// Kho tư liệu BHY one — bảng portal_uploads + bucket private bhy-one.
// API giữ nguyên như bản localStorage cũ để các trang /one không phải đổi.

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function useOneUploads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['one-portal-uploads'],
    queryFn: async (): Promise<UploadedItem[]> => {
      const [{ data: rows, error }, { data: likeRows, error: likeErr }] = await Promise.all([
        supabase
          .from('portal_uploads')
          .select('id, title, category, summary, content, image_path, image_paths, tags, department_name, author_name, is_featured, seed_likes, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('portal_upload_likes').select('upload_id'),
      ]);
      if (error) throw error;
      if (likeErr) throw likeErr;

      const likeCount = new Map<string, number>();
      for (const l of likeRows ?? []) {
        likeCount.set(l.upload_id, (likeCount.get(l.upload_id) ?? 0) + 1);
      }

      const paths = (rows ?? []).flatMap(r => [r.image_path, ...(r.image_paths ?? [])]).filter(Boolean) as string[];
      const signed = await signOnePaths(paths);

      return (rows ?? []).map(r => ({
        id: r.id,
        title: r.title,
        category: r.category as ProgramCategory,
        author: r.author_name,
        department: (r.department_name ?? 'Phòng TCTH') as UploadedItem['department'],
        date: formatDate(r.created_at),
        imageUrl: r.image_path ? signed[r.image_path] : undefined,
        summary: r.summary ?? '',
        content: r.content ?? undefined,
        tags: r.tags ?? [],
        likes: (r.seed_likes ?? 0) + (likeCount.get(r.id) ?? 0),
        isFeatured: r.is_featured,
      }));
    },
    staleTime: 60 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['one-portal-uploads'] }),
    [queryClient],
  );

  // newItem đến từ UploadModal: imageUrl là dataURL base64 (nếu có ảnh)
  const addItem = useCallback(async (newItem: UploadedItem) => {
    try {
      let imagePath: string | null = null;
      if (newItem.imageUrl?.startsWith('data:')) {
        imagePath = await uploadOneImage(newItem.imageUrl, 'staff');
      }
      const { error } = await supabase.from('portal_uploads').insert({
        title: newItem.title,
        category: newItem.category,
        summary: newItem.summary || null,
        content: newItem.content || null,
        image_path: imagePath,
        tags: newItem.tags ?? [],
        department_name: newItem.department,
        author_name: newItem.author,
      });
      if (error) throw new Error(error.message);
      toast.success('Đã đăng tư liệu vào Kho Dữ Liệu');
      refresh();
    } catch (e) {
      toast.error(`Không đăng được tư liệu: ${e instanceof Error ? e.message : e}`);
    }
  }, [refresh]);

  // Mỗi người 1 like — bấm lại khi đã like thì bỏ qua êm (lỗi trùng khóa)
  const likeItem = useCallback(async (itemId: string) => {
    if (!user) return;
    const { error } = await supabase.from('portal_upload_likes').insert({ upload_id: itemId, user_id: user.id });
    if (error && !error.message.includes('duplicate')) {
      toast.error('Không gửi được lượt thích');
      return;
    }
    refresh();
  }, [user, refresh]);

  const deleteItem = useCallback(async (itemId: string) => {
    const { error } = await supabase.from('portal_uploads').delete().eq('id', itemId);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã xóa tư liệu');
    refresh();
  }, [refresh]);

  return { items, addItem, likeItem, deleteItem };
}
