/**
 * THÊM HỌC VIÊN NHANH — phần logic thuần của ba cách thêm (đợt 14):
 *   1. chọn nhiều người có tìm kiếm / lọc phòng (chỉ cần chuanHoaTen để tìm);
 *   2. dán danh sách từ Excel / Zalo → khopDanhSach khớp với danh bạ;
 *   3. ghi danh bằng mã lớp — máy chủ lo, ở đây chỉ có đường dẫn QR và đọc kết quả.
 *
 * Khớp tên bỏ dấu, bỏ hoa thường, gộp khoảng trắng: danh sách TCTH gõ tay hay
 * thiếu dấu («Nguyen Van A»), còn danh bạ thì đủ dấu. Trùng tên (hai «Nguyễn
 * Văn Anh») thì KHÔNG tự chọn — đưa ra cho người dùng chỉ tay, vì thêm nhầm
 * người vào lớp là để lộ tài liệu và bảng điểm cho người không thuộc diện.
 */

export interface NguoiDanhBa {
  id: string;
  full_name: string;
  department_id?: string | null;
  email?: string | null;
  employee_code?: string | null;
}

export interface DongKhop {
  /** Dòng gốc người dùng dán (đã cắt khoảng trắng) */
  goc: string;
  /** Một người khớp duy nhất */
  khop: NguoiDanhBa | null;
  /** Nhiều người cùng tên — người dùng phải chọn */
  ungVien: NguoiDanhBa[];
  /** Đã có trong lớp — bỏ qua, không phải lỗi */
  daCo: boolean;
}

export interface KetQuaKhop {
  dong: DongKhop[];
  /** id những người khớp duy nhất và chưa có trong lớp — sẵn sàng thêm */
  themDuoc: string[];
  soTrungTen: number;
  soKhongKhop: number;
  soDaCo: number;
}

/** Bỏ dấu tiếng Việt, đ → d, về chữ thường, gộp khoảng trắng */
export function chuanHoaTen(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9@._\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách văn bản dán thành từng tên: mỗi dòng một người; trong dòng có thể có
 * số thứ tự đầu dòng («1.», «12)», «-»), tab hoặc dấu phẩy ngăn cột Excel — lấy
 * ô đầu tiên có chữ. Dòng trống bỏ.
 */
export function tachDanhSach(vanBan: string): string[] {
  return vanBan
    .split(/\r?\n/)
    .map((d) => d.replace(/^\s*(\d+[.)\-:]?|[-•*+])\s+/, '').split(/\t|;|,(?=\s)/)[0]?.trim() ?? '')
    .filter((d) => d.length > 0);
}

/**
 * Khớp từng dòng với danh bạ. Thứ tự ưu tiên: email hoặc mã cán bộ khớp đúng
 * → tên khớp đúng sau chuẩn hoá → tên đầy đủ chứa dòng dán (cho phép thiếu
 * họ đệm, nhưng chỉ nhận khi duy nhất).
 */
export function khopDanhSach(vanBan: string, danhBa: NguoiDanhBa[], daTrongLop: Set<string> = new Set()): KetQuaKhop {
  const theoTen = new Map<string, NguoiDanhBa[]>();
  const theoKhoa = new Map<string, NguoiDanhBa>();
  for (const n of danhBa) {
    const t = chuanHoaTen(n.full_name);
    theoTen.set(t, [...(theoTen.get(t) ?? []), n]);
    if (n.email) theoKhoa.set(n.email.toLowerCase().trim(), n);
    if (n.employee_code) theoKhoa.set(n.employee_code.toLowerCase().trim(), n);
  }
  const daChon = new Set<string>();
  const dong: DongKhop[] = tachDanhSach(vanBan).map((goc) => {
    const chuan = chuanHoaTen(goc);
    let ungVien: NguoiDanhBa[] = [];
    const khoa = theoKhoa.get(goc.toLowerCase().trim());
    if (khoa) ungVien = [khoa];
    else if (theoTen.has(chuan)) ungVien = theoTen.get(chuan)!;
    else if (chuan.length >= 4) {
      // Thiếu họ đệm: «Đức Anh» khớp «Trần Đức Anh» — chỉ khi kết thúc bằng đúng cụm đó
      ungVien = danhBa.filter((n) => { const t = chuanHoaTen(n.full_name); return t.endsWith(` ${chuan}`) || t.startsWith(`${chuan} `); });
    }
    const daCo = ungVien.length === 1 && daTrongLop.has(ungVien[0].id);
    const khop = ungVien.length === 1 ? ungVien[0] : null;
    if (khop && !daCo) {
      // Cùng một người dán hai lần thì chỉ tính một
      if (daChon.has(khop.id)) return { goc, khop, ungVien, daCo: true };
      daChon.add(khop.id);
    }
    return { goc, khop, ungVien: ungVien.length > 1 ? ungVien : [], daCo };
  });
  return {
    dong,
    themDuoc: dong.filter((d) => d.khop && !d.daCo).map((d) => d.khop!.id),
    soTrungTen: dong.filter((d) => d.ungVien.length > 1).length,
    soKhongKhop: dong.filter((d) => !d.khop && d.ungVien.length === 0).length,
    soDaCo: dong.filter((d) => d.daCo).length,
  };
}

/** Lọc danh bạ theo ô tìm kiếm — cùng cách chuẩn hoá với dán danh sách */
export function locDanhBa<T extends { full_name: string }>(ds: T[], tuKhoa: string): T[] {
  const k = chuanHoaTen(tuKhoa);
  if (!k) return ds;
  return ds.filter((n) => chuanHoaTen(n.full_name).includes(k));
}

// ---------------------------------------------------------------------------
// Ghi danh bằng mã lớp
// ---------------------------------------------------------------------------

/** Đường dẫn in lên tấm QR ghi danh — cùng khuôn với tấm QR điểm danh (?ma=) */
export function duongDanGhiDanh(origin: string, ma: string): string {
  return `${origin}/one/training-center/ghi-danh?ma=${encodeURIComponent(ma)}`;
}

/** Mã lớp gõ tay: bỏ khoảng trắng, chữ hoa, đổi 0→O 1→I vì bảng mã không có 0 và 1 */
export function chuanHoaMaLop(s: string): string {
  return s.replace(/\s+/g, '').toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I').slice(0, 6);
}

export type TrangThaiGhiDanh = 'cho_duyet' | 'da_duyet' | 'tu_choi';

export interface TtcGhiDanh {
  id: string;
  chuong_trinh_id: string;
  nguoi: string;
  trang_thai: TrangThaiGhiDanh;
  ly_do: string | null;
  duyet_boi: string | null;
  duyet_luc: string | null;
  created_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface KetQuaXemMa {
  ok: boolean;
  thong_bao?: string;
  chuong_trinh_id?: string;
  ten?: string;
  ngay_bd?: string;
  ngay_kt?: string;
  nhom_doi_tuong?: string;
  tu_duyet?: boolean;
  /** 'thanh_vien' | trạng thái yêu cầu | null khi chưa xin */
  trang_thai_cua_toi?: 'thanh_vien' | TrangThaiGhiDanh | null;
}

export interface KetQuaXinGhiDanh {
  ok: boolean;
  thong_bao: string;
  trang_thai?: 'thanh_vien' | 'cho_duyet';
  chuong_trinh_id?: string;
  ten?: string;
}

export const TEN_TRANG_THAI_GHI_DANH: Record<TrangThaiGhiDanh, string> = {
  cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối',
};
