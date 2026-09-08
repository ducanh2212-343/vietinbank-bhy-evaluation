/**
 * Bắc Hưng Yên Connect — kiểu dữ liệu và phép tính thuần cho dòng thời gian.
 *
 * Tách khỏi hook để kiểm thử được không cần Supabase, và để hai nơi (trang
 * Connect, form soạn) dùng chung một cách hiểu về «loại hoạt động» và «ai
 * soạn được». Luật «ai soạn được» phải TRÙNG với hàm connect_soan_duoc trong
 * migration 20261021090000_bhy_connect_dong_thoi_gian.sql — RLS mới là hàng
 * rào thật, bản này chỉ để giấu nút với người không có quyền.
 */
import type { UploadedItem } from '@/data/one/types';

export type LoaiHoatDongConnect = 'hoi-nghi' | 'dien-dan' | 'ket-noi' | 'thu-vien' | 'dau-moc';

export const LOAI_HOAT_DONG: Record<LoaiHoatDongConnect, { ten: string; moTa: string }> = {
  'hoi-nghi': { ten: 'Hội nghị khách hàng', moTa: 'Hội nghị kết nối theo mùa Thu – Xuân' },
  'dien-dan': { ten: 'Diễn đàn tri thức', moTa: 'Hội thảo, diễn đàn chia sẻ (Chạm AI…)' },
  'ket-noi': { ten: 'Kết nối hợp tác', moTa: 'Ghép nối đối tác, ký kết, thăm doanh nghiệp' },
  'thu-vien': { ten: 'Thư viện Connect', moTa: 'Thư ngỏ, Onepage, hồ sơ năng lực, tư liệu' },
  'dau-moc': { ten: 'Dấu mốc chương trình', moTa: 'Khởi động, tổng kết, mở rộng' },
};

export const THU_TU_LOAI: LoaiHoatDongConnect[] = ['dau-moc', 'hoi-nghi', 'dien-dan', 'ket-noi', 'thu-vien'];

/** Một dòng trong dòng thời gian, đã ký ảnh và nối với bài viết (nếu có). */
export interface HoatDongConnect {
  id: string;
  ngay: string; // YYYY-MM-DD
  loai: LoaiHoatDongConnect;
  tieuDe: string;
  moTa: string | null;
  diemNhan: string[];
  /** Đường dẫn ảnh riêng trong kho (chưa ký) */
  anh: string[];
  /** URL ảnh đã ký: ảnh riêng trước, rồi ảnh của bài viết gắn kèm */
  anhUrls: string[];
  baiVietId: string | null;
  baiViet?: UploadedItem;
  lienKet: string | null;
  noiBat: boolean;
  moChoKhach: boolean;
  /** Dòng nạp sẵn trong mã (chưa áp migration) — không sửa/xoá được */
  tinh?: boolean;
}

/** Cùng luật với connect_soan_duoc(): admin nội dung, Ban Giám đốc, cán bộ KHDN hoặc TCTH. */
export function soanDuocConnect(roles: readonly string[], maPhong: string | null | undefined): boolean {
  if (roles.includes('guest')) return false;
  if (roles.includes('system_admin') || roles.includes('tcth_admin') || roles.includes('bgd')) return true;
  return maPhong === 'KHDN' || maPhong === 'TCTH';
}

/** Ô nhập «mỗi dòng một điểm nhấn» → mảng sạch, tối đa 6 (trùng trần của trigger). */
export function tachDiemNhan(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

/** Mới nhất lên đầu; cùng ngày thì dòng nổi bật trước. */
export function sapXepHoatDong<T extends { ngay: string; noiBat: boolean }>(ds: T[]): T[] {
  return [...ds].sort((a, b) => (a.ngay === b.ngay ? Number(b.noiBat) - Number(a.noiBat) : b.ngay < a.ngay ? -1 : 1));
}

/** Nhóm theo năm để dựng cột mốc năm trên dòng thời gian. */
export function nhomTheoNam<T extends { ngay: string; noiBat: boolean }>(ds: T[]): { nam: string; muc: T[] }[] {
  const nhom = new Map<string, T[]>();
  for (const h of sapXepHoatDong(ds)) {
    const nam = h.ngay.slice(0, 4);
    nhom.set(nam, [...(nhom.get(nam) ?? []), h]);
  }
  return [...nhom.entries()].map(([nam, muc]) => ({ nam, muc }));
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' cho giao diện; chuỗi lạ thì trả nguyên. */
export function ngayVN(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Dòng «Chạm AI» là dòng duy nhất có thư mời dựng lại thành chữ trên trang
 * (src/data/one/connectThuMoi.ts). Nhận diện theo tiêu đề thay vì thêm cột:
 * thư mời tĩnh trong mã chỉ có một, khi có diễn đàn thứ hai thì lúc đó mới
 * đáng thiết kế cột riêng.
 */
export function laDongChamAI(h: { tieuDe: string }): boolean {
  return /chạm ai/i.test(h.tieuDe);
}

/** Bài thuộc chuyên mục «Bắc Hưng Yên Connect & Thư viện» trong kho tư liệu. */
export function locBaiConnect(items: UploadedItem[]): UploadedItem[] {
  return items.filter((it) => it.category === 'connect');
}
