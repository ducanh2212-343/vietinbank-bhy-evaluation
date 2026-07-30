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
          .select('id, title, category, summary, content, image_path, image_paths, custom_values, tags, department_name, author_name, is_featured, is_shared_with_guests, seed_likes, created_at')
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

      return (rows ?? []).map(r => {
        // Gộp image_path (ảnh bìa) + image_paths rồi khử trùng lặp: bản ghi import cũ lưu
        // image_paths = các ảnh CÒN LẠI sau ảnh bìa, bản ghi mới lưu đủ toàn bộ ảnh
        const allPaths = [r.image_path, ...(r.image_paths ?? [])]
          .filter((p): p is string => !!p)
          .filter((p, i, a) => a.indexOf(p) === i);
        const imageUrls = allPaths.map(p => signed[p]).filter(Boolean) as string[];
        return {
          id: r.id,
          title: r.title,
          category: r.category as ProgramCategory,
          author: r.author_name,
          department: (r.department_name ?? 'Phòng TCTH') as UploadedItem['department'],
          date: formatDate(r.created_at),
          imageUrl: imageUrls[0] ?? (r.image_path ? signed[r.image_path] : undefined),
          imageUrls,
          customValues: (r.custom_values ?? null) as Record<string, string> | null,
          summary: r.summary ?? '',
          content: r.content ?? undefined,
          tags: r.tags ?? [],
          likes: (r.seed_likes ?? 0) + (likeCount.get(r.id) ?? 0),
          isFeatured: r.is_featured,
          isShared: r.is_shared_with_guests,
        };
      });
    },
    staleTime: 60 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['one-portal-uploads'] }),
    [queryClient],
  );

  // newItem đến từ UploadModal: imageUrls là các dataURL base64 (ảnh không phải
  // dataURL — ví dụ ảnh minh họa mặc định — bị bỏ qua, không upload).
  const addItem = useCallback(async (newItem: UploadedItem) => {
    try {
      const dataUrls = (newItem.imageUrls ?? (newItem.imageUrl ? [newItem.imageUrl] : []))
        .filter(u => u.startsWith('data:'));
      const imagePaths: string[] = [];
      for (const u of dataUrls) {
        imagePaths.push(await uploadOneImage(u, 'staff'));
      }
      // Chỉ giữ giá trị trường bổ sung có nội dung thực
      const customEntries = Object.entries(newItem.customValues ?? {}).filter(([, v]) => v?.trim());
      const { error } = await supabase.from('portal_uploads').insert({
        title: newItem.title,
        category: newItem.category,
        summary: newItem.summary || null,
        content: newItem.content || null,
        // Ảnh đầu tiên vẫn ghi vào image_path để tương thích dữ liệu/luồng cũ
        image_path: imagePaths[0] ?? null,
        image_paths: imagePaths,
        custom_values: customEntries.length ? Object.fromEntries(customEntries) : null,
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

  // Chia sẻ/ngừng chia sẻ cho khách đối tác. Khi bật chia sẻ, ảnh đang ở path
  // staff/… được sao chép sang shared/… (guest chỉ đọc được shared/ theo RLS storage).
  const toggleShare = useCallback(async (itemId: string, nextShared: boolean) => {
    try {
      const { data: row, error: rowErr } = await supabase
        .from('portal_uploads')
        .select('image_path, image_paths')
        .eq('id', itemId)
        .single();
      if (rowErr) throw new Error(rowErr.message);

      const moveToShared = async (path: string): Promise<string> => {
        if (!nextShared || !path.startsWith('staff/')) return path;
        const { data: blob, error: dlErr } = await supabase.storage.from('bhy-one').download(path);
        if (dlErr || !blob) throw new Error(dlErr?.message ?? 'download failed');
        const newPath = 'shared/' + path.split('/').pop();
        const { error: upErr } = await supabase.storage.from('bhy-one')
          .upload(newPath, blob, { contentType: blob.type, upsert: true });
        if (upErr) throw new Error(upErr.message);
        return newPath;
      };

      const newMain = row.image_path ? await moveToShared(row.image_path) : null;
      const newExtra: string[] = [];
      for (const p of row.image_paths ?? []) newExtra.push(await moveToShared(p));

      const { error } = await supabase
        .from('portal_uploads')
        .update({ is_shared_with_guests: nextShared, image_path: newMain, image_paths: newExtra })
        .eq('id', itemId);
      if (error) throw new Error(error.message);
      toast.success(nextShared ? 'Đã chia sẻ cho khách đối tác' : 'Đã ngừng chia sẻ');
      refresh();
    } catch (e) {
      toast.error(`Không đổi được trạng thái chia sẻ: ${e instanceof Error ? e.message : e}`);
    }
  }, [refresh]);

  const deleteItem = useCallback(async (itemId: string) => {
    const { error } = await supabase.from('portal_uploads').delete().eq('id', itemId);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã xóa tư liệu');
    refresh();
  }, [refresh]);

  return { items, addItem, likeItem, deleteItem, toggleShare };
}
