/**
 * Gọi máy chủ từ trang danh thiếp công khai — bằng fetch thuần.
 *
 * Cố ý KHÔNG dùng supabase-js: thư viện đó (cùng React Query) chiếm hơn 60 KB
 * gzip, trong khi trang này chỉ cần đúng hai lời gọi RPC không cần phiên đăng
 * nhập. Anon key vốn nằm sẵn trong mã trang của cổng (xem
 * src/integrations/supabase/client.ts) — an toàn dựa vào RLS và các hàm
 * SECURITY DEFINER đã cấp đúng quyền cho anon, không dựa vào giấu key.
 */
import type { KetQuaResolve } from '@/lib/danhThiep/kieu';
import type { MaNgonNgu } from '@/lib/danhThiep/ngonNgu';

export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://whlysprzsguehxmrjwha.supabase.co';
const ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHlzcHJ6c2d1ZWh4bXJqd2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTk5NDksImV4cCI6MjA5NzMzNTk0OX0.9VArZm-Pq7Nq0-fJSo1l65SNcAGM8P87jE99b6xIEws';

export type KenhQuet = 'qr' | 'wallet' | 'nfc' | 'direct';

export function chuanHoaKenh(v: string | null | undefined): KenhQuet {
  return v === 'qr' || v === 'wallet' || v === 'nfc' ? v : 'direct';
}

async function rpc<T>(ten: string, body: Record<string, unknown>, keepalive = false): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${ten}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Đọc thẻ đã lọc theo ma trận quyền hiển thị (nc_resolve_card). */
export function taiThe(slug: string): Promise<KetQuaResolve> {
  return rpc<KetQuaResolve>('nc_resolve_card', { _slug: slug });
}

/** Ghi nhật ký quét — bắn và quên; lỗi mạng không được làm hỏng trải nghiệm khách. */
export function ghiQuet(
  slug: string, lang: MaNgonNgu, channel: KenhQuet, action: string, country: string | null,
): void {
  rpc('nc_ghi_nhat_ky_quet', {
    _slug: slug, _lang: lang, _channel: channel, _action: action, _country: country,
  }, true).catch(() => { /* bỏ qua */ });
}

/** Đường dẫn tải .vcf — edge function trả đúng Content-Type để iOS mở thẳng «Thêm liên hệ». */
export function urlVcard(slug: string, lang: MaNgonNgu, channel: KenhQuet): string {
  const q = new URLSearchParams({ slug, lang, c: channel });
  return `${SUPABASE_URL}/functions/v1/danh-thiep-vcard?${q.toString()}`;
}

/**
 * Đường dẫn «Thêm vào Google Wallet». Edge function ký JWT bằng khoá riêng của
 * Chi nhánh rồi chuyển hướng sang Google — trình duyệt không giữ khoá nào.
 */
export function urlWallet(slug: string, lang: MaNgonNgu): string {
  const q = new URLSearchParams({ slug, lang });
  return `${SUPABASE_URL}/functions/v1/danh-thiep-wallet?${q.toString()}`;
}
