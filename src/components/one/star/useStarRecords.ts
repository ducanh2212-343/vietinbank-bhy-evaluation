import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { STAR_WRITE_LOCKED, STAR_WRITE_LOCK_TOAST } from './starImportLock';

// Phiếu Sao Xứng Đáng — bảng star_records (mỗi phiếu một dòng).
//
// Nguồn dữ liệu duy nhất hiện nay là bản kết xuất từ form Lark của Chi nhánh, do
// Phòng TCTH nhập vào cổng (source='import'). Cổng KHÔNG còn ô nhập phiếu riêng:
// đường ghi nhận chính thức là form Lark → Zalo OA (xem StarRecognitionForm).
// Cột source vẫn giữ giá trị 'form' cho dữ liệu lịch sử và cho khả năng nối API sau này.

export interface StarRecord {
  id: string;
  name: string;
  department: string;
  stars: number;
  reason: string;
  result: string;
  /** yyyy-mm-dd */
  date: string;
  sender: string;
  serial: string;
  isCollective: boolean;
  source: 'import' | 'form';
}

export interface StarRecordInput {
  name: string;
  department: string;
  stars: number;
  reason: string;
  result: string;
  date: string;
  sender: string;
  serial: string;
  isCollective: boolean;
}

const KEY = ['one-star-records'];

export function useStarRecords() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const isContentAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { data: records = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<StarRecord[]> => {
      const { data, error } = await supabase
        .from('star_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        department: r.department,
        stars: Number(r.stars),
        reason: r.reason ?? '',
        result: r.result ?? '',
        date: r.awarded_on,
        sender: r.sender ?? '',
        serial: r.serial ?? '',
        isCollective: r.is_collective,
        source: r.source as 'import' | 'form',
      }));
    },
    staleTime: 30 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: KEY }),
    [queryClient],
  );

  // Admin: thay thế TOÀN BỘ dữ liệu bằng kết quả nhập file (như bản gốc, nhưng có preview trước đó)
  const replaceAll = useCallback(async (recs: StarRecordInput[]): Promise<boolean> => {
    if (STAR_WRITE_LOCKED) {
      toast.error(STAR_WRITE_LOCK_TOAST);
      return false;
    }
    const { error: delErr } = await supabase.from('star_records')
      .delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) {
      toast.error(`Không xóa được dữ liệu cũ: ${delErr.message}`);
      return false;
    }
    // Insert theo lô 200 dòng
    for (let i = 0; i < recs.length; i += 200) {
      const batch = recs.slice(i, i + 200).map(rec => ({
        name: rec.name,
        department: rec.department,
        stars: rec.stars,
        reason: rec.reason || null,
        result: rec.result || null,
        awarded_on: rec.date,
        sender: rec.sender || null,
        serial: rec.serial || null,
        is_collective: rec.isCollective,
        source: 'import' as const,
      }));
      const { error } = await supabase.from('star_records').insert(batch);
      if (error) {
        toast.error(`Lỗi khi ghi lô ${i / 200 + 1}: ${error.message}`);
        refresh();
        return false;
      }
    }
    toast.success(`Đã nhập ${recs.length} phiếu sao (thay thế toàn bộ dữ liệu cũ)`);
    refresh();
    return true;
  }, [refresh]);

  const deleteRecord = useCallback(async (id: string) => {
    if (STAR_WRITE_LOCKED) {
      toast.error(STAR_WRITE_LOCK_TOAST);
      return;
    }
    const { error } = await supabase.from('star_records').delete().eq('id', id);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    refresh();
  }, [refresh]);

  const deleteAll = useCallback(async () => {
    if (STAR_WRITE_LOCKED) {
      toast.error(STAR_WRITE_LOCK_TOAST);
      return;
    }
    const { error } = await supabase.from('star_records')
      .delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã xóa toàn bộ phiếu sao');
    refresh();
  }, [refresh]);

  return { records, isLoading, isContentAdmin, replaceAll, deleteRecord, deleteAll };
}
