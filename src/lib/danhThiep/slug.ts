/**
 * Xem trước slug ở màn quản trị — cùng quy tắc với hàm nc_tao_slug() trong
 * CSDL (nguồn thật; CSDL vẫn tự sinh và tự thêm đuôi ngẫu nhiên nếu trùng).
 */
import { boDau } from '@/lib/vietnamese';

export function slugTuTen(ten: string): string {
  const goc = boDau(ten).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (goc.length < 3 ? 'can-bo' : goc).slice(0, 60);
}

export function slugHopLe(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 80;
}
