/**
 * Cửa vào CSDL cho phân hệ danh thiếp số.
 *
 * Bảng/hàm nc_* nằm trong migration 20261004090000 chưa có trong
 * src/integrations/supabase/types.ts (types sinh máy sau khi áp migration). Theo
 * khuôn đang dùng của repo cho bảng chưa regenerate, ép kiểu MỘT LẦN ở đây thay
 * vì rải `(supabase as any)` khắp các màn; khi regenerate xong chỉ cần đổi
 * `db` về `supabase`.
 */
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

/** Gọi RPC và ném lỗi có thông điệp — nơi gọi chỉ việc try/catch. */
export async function goiRpc<T>(ten: string, thamSo: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(ten, thamSo);
  if (error) {
    const e = new Error(error.message) as Error & { code?: string };
    e.code = error.code;
    throw e;
  }
  return data as T;
}

/** URL công khai của một tệp trong kho ảnh danh thiếp (bucket public). */
export function urlAnhDanhThiep(duongDan: string): string {
  const { data } = supabase.storage.from('nc-danh-thiep').getPublicUrl(duongDan);
  return data.publicUrl;
}

/**
 * Bảng nc_* chưa có trên máy chủ (migration chưa áp) → PostgREST trả 42P01 /
 * PGRST205. Nhận diện để màn hình nói thẳng «phân hệ chưa kích hoạt» thay vì
 * thử lại nhiều lần rồi im lặng — đó là lý do trang «Danh thiếp số của tôi»
 * từng chờ 7 giây trên bản thử.
 */
export function laChuaKichHoat(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST202') return true;
  return /does not exist|Could not find the (table|function)/i.test(e.message ?? '');
}

/** Chính sách thử lại cho mọi truy vấn nc_*: không thử lại khi phân hệ chưa kích hoạt. */
export function thuLaiNc(soLan: number, err: unknown): boolean {
  return !laChuaKichHoat(err) && soLan < 1;
}
