import { CATEGORY_NAMES, type ProgramCategory } from '@/data/one/types';

/**
 * Chuẩn hoá chuyên mục / phòng ban của bài đăng trong kho tư liệu.
 *
 * Vì sao cần: giá trị `categories_config` và `departments_config` trong bảng
 * nội dung là chuỗi JSON (`{"connect":"Bắc Hưng Yên Connect & Thư viện",…}`),
 * nhưng bản đọc cấu hình cũ chỉ tách theo dấu phẩy. Hộp đăng bài vì thế hiện
 * ra các lựa chọn dạng `"connect":"Bắc Hưng Yên Connect & Thư viện"` và ghi
 * NGUYÊN chuỗi đó vào cột chuyên mục — bài về Chạm AI (09/2026) không lọt vào
 * chuyên mục Connect dù cán bộ đã chọn đúng. Ba bản ghi thật đang mang giá trị
 * hỏng như vậy, nên phía đọc phải hiểu được chúng chứ không chỉ sửa phía ghi.
 */

/** Đọc cấu hình danh sách: nhận JSON object (lấy giá trị), JSON array, hoặc chuỗi tách phẩy/xuống dòng. */
export function docCauHinhDanhSach(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null;
  const chuoi = raw.trim();
  if (chuoi.startsWith('{') || chuoi.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(chuoi);
      const list = (Array.isArray(parsed) ? parsed : Object.values(parsed as Record<string, unknown>))
        .filter((v): v is string => typeof v === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length > 0) return list;
    } catch {
      // JSON hỏng thì rơi xuống cách tách cũ
    }
  }
  const list = chuoi.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
}

const MA_CHUYEN_MUC = new Set(Object.keys(CATEGORY_NAMES));

/** `"connect":"Bắc Hưng Yên Connect & Thư viện"` → `connect`; tên hiển thị → mã; mã đúng thì giữ. */
export function chuanHoaChuyenMuc(raw: string | null | undefined): ProgramCategory | string {
  const chuoi = (raw ?? '').trim();
  if (!chuoi) return chuoi;
  if (MA_CHUYEN_MUC.has(chuoi)) return chuoi as ProgramCategory;

  const manh = /^"?([a-z0-9_]+)"?\s*:\s*"?(.*?)"?$/i.exec(chuoi);
  if (manh && MA_CHUYEN_MUC.has(manh[1])) return manh[1] as ProgramCategory;

  const boNgoac = chuoi.replace(/^"|"$/g, '');
  const theoTen = (Object.entries(CATEGORY_NAMES) as [ProgramCategory, string][]).find(([, ten]) => ten === boNgoac);
  return theoTen ? theoTen[0] : boNgoac;
}

/** `"Phòng KHDN"` (kèm ngoặc kép do cấu hình đọc sai) → `Phòng KHDN`. */
export function chuanHoaPhongBan(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^"|"$/g, '');
}
