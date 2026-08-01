import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HoSoTinDung, NhipHoSo } from '@/lib/ct2TinDung';

/**
 * Lớp dữ liệu bàn Phê duyệt tín dụng. Cùng nguyên tắc hiệu năng với bàn đầu
 * việc: mỗi màn hình nóng một vòng gọi, cache theo staleTime, không websocket.
 */

interface Ket { data: unknown; error: { code?: string; message?: string } | null }
interface Chain extends PromiseLike<Ket> {
  eq(c: string, v: unknown): Chain;
  order(c: string, o?: { ascending?: boolean }): Chain;
  limit(n: number): Chain;
}
const db = supabase as unknown as {
  from(t: string): {
    select(c: string): Chain;
    insert(v: unknown): { select(c: string): { single(): PromiseLike<Ket> } } & PromiseLike<Ket>;
    update(v: unknown): Chain;
  };
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Ket>;
};

const NUA_PHUT = 30_000;
const NAM_PHUT = 300_000;

/** Phòng nào được bật bàn PDTD — danh sách rất ngắn, cache dài */
export function useCt2PhongPdtd() {
  return useQuery({
    queryKey: ['ct2', 'phong-pdtd'],
    staleTime: NAM_PHUT,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.from('ct2_phong_pdtd').select('phong, bat');
      if (error) throw error;
      return ((data ?? []) as Array<{ phong: string; bat: boolean }>)
        .filter((p) => p.bat)
        .map((p) => p.phong);
    },
  });
}

/** Toàn bộ hồ sơ của một phòng — 1 query qua index (phong, trang_thai) */
export function useCt2HoSo(phongId: string | null, bat: boolean) {
  return useQuery({
    queryKey: ['ct2', 'ho-so', phongId],
    enabled: !!phongId && bat,
    staleTime: NUA_PHUT,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_ho_so_tin_dung')
        .select('*')
        .eq('phong', phongId)
        .order('han_xu_ly');
      if (error) throw error;
      return (data ?? []) as HoSoTinDung[];
    },
  });
}

export interface HoSoSapDenHan {
  id: string; ma_hs: string | null; khach_hang: string; so_tien: number;
  ngay_den_han_ghtd: string; con_lai: number; da_co_ho_so_moi: boolean;
}

/**
 * Hạn mức sắp đến hạn — kèm cờ «đã có hồ sơ tái cấp đang chạy chưa».
 * Bản Miro không phát hiện được việc này vì «đến hạn GHTD» bị để lẫn vào cột
 * trạng thái, nên không đối chiếu được với đường ống hồ sơ đang chạy.
 */
export function useCt2SapDenHan(phongId: string | null, bat: boolean) {
  return useQuery({
    queryKey: ['ct2', 'sap-den-han', phongId],
    enabled: !!phongId && bat,
    staleTime: NUA_PHUT,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc('ct2_pdtd_sap_den_han', { _phong: phongId });
      if (error) throw error;
      return (data ?? []) as HoSoSapDenHan[];
    },
  });
}

/** Nhật ký một hồ sơ — chỉ tải khi mở chi tiết */
export function useCt2NhatKyHoSo(hoSoId: string | null) {
  return useQuery({
    queryKey: ['ct2', 'nhat-ky-ho-so', hoSoId],
    enabled: !!hoSoId,
    staleTime: 10_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_nhip_ho_so')
        .select('*')
        .eq('ho_so_id', hoSoId)
        .order('ghi_luc', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NhipHoSo[];
    },
  });
}

export function useCt2LamTuoiHoSo() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['ct2', 'ho-so'] });
    qc.invalidateQueries({ queryKey: ['ct2', 'sap-den-han'] });
    qc.invalidateQueries({ queryKey: ['ct2', 'nhat-ky-ho-so'] });
  };
}

// --- Thao tác ghi ---------------------------------------------------------

const loi = (e: { message?: string } | null) => (e ? (e.message ?? 'Có lỗi không xác định.') : null);

export async function ct2TaoHoSo(v: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_ho_so_tin_dung').insert(v);
  return { error: loi(error) };
}

export async function ct2SuaHoSo(id: string, v: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_ho_so_tin_dung').update(v).eq('id', id);
  return { error: loi(error) };
}

export async function ct2GhiNhipHoSo(v: {
  ho_so_id: string; nguoi_ghi: string; buoc: string; noi_dung: string; vuong_mac: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_nhip_ho_so').insert(v);
  return { error: loi(error) };
}
