import type { UploadedItem } from '@/data/one/types';

/**
 * Tin tức nội bộ BHY ONE — quy tắc sắp xếp và hiển thị.
 *
 * Tin nội bộ dùng chung kho `portal_uploads` với Kho tri thức: cùng một bài chia
 * sẻ vừa là tin trên Trang chủ vừa là tư liệu tra cứu được. Tách thành bảng
 * riêng thì cán bộ phải đăng hai lần cho cùng một nội dung.
 *
 * Cột `is_featured` (đã có sẵn) chính là cờ GHIM. Ghim là việc của TCTH/admin —
 * RLS chỉ cho system_admin và tcth_admin ghi vào bảng này.
 *
 * Toàn bộ hàm ở đây là hàm thuần để test được mà không cần dựng Supabase.
 */

/** Số tin tối đa đưa lên dải trượt ngang ở Trang chủ. */
export const SO_TIN_TRANG_CHU = 12;

/**
 * Ghim lên đầu, phần còn lại giữ nguyên thứ tự mới nhất trước.
 *
 * Không tự sắp lại theo ngày: truy vấn đã `order('created_at', desc)`, mà chuỗi
 * `date` hiển thị là "d/m/yyyy" — sắp lại theo chuỗi đó sẽ sai ngay khi sang
 * tháng mới. `Array.prototype.sort` ổn định từ ES2019 nên thứ tự cũ được giữ.
 */
export function sapXepTinTuc(items: UploadedItem[]): UploadedItem[] {
  return [...items].sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured));
}

/** Tin đưa lên Trang chủ: đã ghim lên đầu và cắt còn `soLuong` tin. */
export function tinTrangChu(items: UploadedItem[], soLuong = SO_TIN_TRANG_CHU): UploadedItem[] {
  return sapXepTinTuc(items).slice(0, soLuong);
}

/**
 * Đọc chuỗi ngày "d/m/yyyy" mà `useOneUploads` sinh ra.
 *
 * Không dùng `new Date(chuoi)`: trình duyệt hiểu "3/4/2026" theo kiểu Mỹ
 * (tháng 3 ngày 4) nên mọi ngày ≤ 12 đều lệch tháng.
 */
export function docNgayVN(chuoi: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(chuoi.trim());
  if (!m) return null;
  const ngay = Number(m[1]);
  const thang = Number(m[2]);
  const nam = Number(m[3]);
  const d = new Date(nam, thang - 1, ngay);
  // Chặn ngày không tồn tại kiểu 31/2: Date tự cuộn sang tháng sau
  if (d.getDate() !== ngay || d.getMonth() !== thang - 1) return null;
  return d;
}

/**
 * Nhãn thời gian ngắn cho thẻ tin: "Hôm nay", "Hôm qua", "N ngày trước", rồi
 * quay về ngày đầy đủ khi đã quá một tuần — dải trượt ngang không đủ chỗ cho
 * chuỗi dài, mà tin cũ thì mốc chính xác mới có ích.
 */
export function nhanThoiGian(chuoi: string, moc: Date): string {
  const d = docNgayVN(chuoi);
  if (!d) return chuoi;
  const nuaDem = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const soNgay = Math.round((nuaDem(moc) - nuaDem(d)) / 86_400_000);
  if (soNgay < 0) return chuoi;
  if (soNgay === 0) return 'Hôm nay';
  if (soNgay === 1) return 'Hôm qua';
  if (soNgay <= 7) return `${soNgay} ngày trước`;
  return chuoi;
}

/**
 * Lọc tin theo từ khóa — tìm trong tiêu đề, tóm tắt, tác giả và phòng.
 * Dùng cho màn hình quản trị; so khớp bỏ dấu để gõ "chia se" vẫn ra "chia sẻ".
 */
export function locTinTuc(items: UploadedItem[], tuKhoa: string, boDau: (s: string) => string): UploadedItem[] {
  const q = boDau(tuKhoa).trim();
  if (!q) return items;
  return items.filter((i) =>
    boDau(`${i.title} ${i.summary} ${i.author} ${i.department}`).includes(q),
  );
}
