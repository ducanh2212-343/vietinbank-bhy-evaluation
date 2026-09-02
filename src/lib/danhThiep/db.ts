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
  if (error) throw new Error(error.message);
  return data as T;
}

/** URL công khai của một tệp trong kho ảnh danh thiếp (bucket public). */
export function urlAnhDanhThiep(duongDan: string): string {
  const { data } = supabase.storage.from('nc-danh-thiep').getPublicUrl(duongDan);
  return data.publicUrl;
}
