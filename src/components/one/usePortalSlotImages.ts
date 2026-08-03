import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { signOnePaths, uploadOneImage } from '@/lib/oneStorage';

// Gallery ảnh theo slot của cổng BHY one (bảng portal_images).
// slot_key = `${prefix}.${id}` (vd 'pillar.quizzi', 'move.move1'), sort_order = vị trí ảnh.
// image_path là path trong bucket bhy-one hoặc URL http(s) trực tiếp.
// Trả về Record<id, string[]> cùng hình dạng với bản localStorage cũ.

export function usePortalSlotImages(
  prefix: 'pillar' | 'move' | 'culture',
  defaults: Record<string, string[]>,
) {
  const queryClient = useQueryClient();
  const queryKey = ['one-portal-images', prefix];

  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<Record<string, string[]>> => {
      const { data: rows, error } = await supabase
        .from('portal_images')
        .select('slot_key, image_path, sort_order')
        .like('slot_key', `${prefix}.%`)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;

      const storagePaths = (rows ?? []).map(r => r.image_path).filter(p => !p.startsWith('http'));
      const signed = await signOnePaths(storagePaths);

      // Bắt đầu từ ảnh mặc định, đè theo (slot, vị trí) có trong DB
      const out: Record<string, string[]> = Object.fromEntries(
        Object.entries(defaults).map(([k, v]) => [k, [...v]]),
      );
      for (const r of rows ?? []) {
        const id = r.slot_key.slice(prefix.length + 1);
        const url = r.image_path.startsWith('http') ? r.image_path : signed[r.image_path];
        if (!url) continue;
        if (!out[id]) out[id] = [];
        out[id][r.sort_order] = url;
      }
      return out;
    },
    staleTime: 5 * 60 * 1000,
  });

  // fileOrUrl: dataURL base64 (từ FileReader) hoặc URL http(s)
  const handleImageUpload = useCallback(async (id: string, index: number, fileOrUrl: string) => {
    try {
      const imagePath = fileOrUrl.startsWith('data:')
        ? await uploadOneImage(fileOrUrl, 'staff')
        : fileOrUrl;
      const slotKey = `${prefix}.${id}`;
      const { data: existing } = await supabase
        .from('portal_images')
        .select('id')
        .eq('slot_key', slotKey)
        .eq('sort_order', index)
        .eq('is_active', true)
        .maybeSingle();
      const { error } = existing
        ? await supabase.from('portal_images').update({ image_path: imagePath }).eq('id', existing.id)
        : await supabase.from('portal_images').insert({ slot_key: slotKey, image_path: imagePath, sort_order: index });
      if (error) throw new Error(error.message);
      toast.success('Đã cập nhật ảnh');
      queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      toast.error(`Không cập nhật được ảnh: ${e instanceof Error ? e.message : e}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, queryClient]);

  return { images: data ?? defaults, handleImageUpload };
}
