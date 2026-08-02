/**
 * Mốc giờ và ngưỡng của nhịp Chiêu thức 2 — bản dùng chung phía client.
 *
 * Trước đây các con số này chôn cứng: trước 08:00 là đúng giờ, khung «bảng
 * sống» 06:45–08:45, ngưỡng cột chờ 3 ngày. Muốn đổi giờ giao ban thì phải sửa
 * mã và triển khai lại — TCTH không tự làm được. Nay database giữ đúng một dòng
 * cấu hình, client nạp về sổ này khi khởi động.
 *
 * Cùng cách làm với `lichNghi.ts`: sổ cấp module thay vì truyền tham số qua cả
 * chuỗi hàm thuần, nhưng mọi hàm vẫn nhận tham số ghi đè để kiểm thử không phụ
 * thuộc trạng thái toàn cục.
 *
 * Hàng rào thật vẫn ở database — trigger chấm giờ đọc thẳng bảng cấu hình. Sổ
 * này chỉ để giao diện hiện đúng con số mà không phải hỏi server mỗi lần.
 */

export interface CauHinhNhip {
  /** Trước giờ này = đúng giờ */
  gio_dung_gio: string;
  /** Từ gio_dung_gio đến giờ này = muộn (lãnh đạo Phòng vẫn tính đúng giờ) */
  gio_an_han: string;
  /** Khung bảng tự làm mới */
  gio_mo_nhip: string;
  gio_dong_nhip: string;
  /** Khung được phép phát thông báo */
  gio_yen_tinh_tu: string;
  gio_yen_tinh_den: string;
  /** Ngưỡng cảnh báo, tính bằng ngày làm việc */
  nguong_tuoi_cho: number;
  nguong_im_lang_ho_so: number;
  /** Trần thông báo nhắc nhẹ mỗi người mỗi ngày */
  tran_thong_bao: number;
}

/**
 * Mặc định trùng khớp với DEFAULT của bảng ct2_cau_hinh_thoi_gian. Dùng khi
 * chưa nạp xong hoặc khi mạng lỗi — giao diện vẫn hiện đúng thói quen hiện tại
 * của Chi nhánh thay vì hiện số 0.
 */
export const CAU_HINH_MAC_DINH: CauHinhNhip = {
  gio_dung_gio: '08:00',
  gio_an_han: '08:30',
  gio_mo_nhip: '06:45',
  gio_dong_nhip: '08:45',
  gio_yen_tinh_tu: '07:00',
  gio_yen_tinh_den: '18:00',
  nguong_tuoi_cho: 3,
  nguong_im_lang_ho_so: 2,
  tran_thong_bao: 3,
};

let soHienTai: CauHinhNhip = { ...CAU_HINH_MAC_DINH };

export function datCauHinhNhip(c: Partial<CauHinhNhip> | null | undefined): void {
  soHienTai = { ...CAU_HINH_MAC_DINH, ...(c ?? {}) };
}

/** Trả về mặc định — dùng trong kiểm thử để các bài không ảnh hưởng nhau */
export function xoaCauHinhNhip(): void {
  soHienTai = { ...CAU_HINH_MAC_DINH };
}

export function cauHinhNhip(): CauHinhNhip {
  return soHienTai;
}

/** «08:00:00» hoặc «08:00» → số phút từ nửa đêm */
export function gioSangPhut(gio: string): number {
  const [h, p] = gio.split(':').map(Number);
  return (h || 0) * 60 + (p || 0);
}

/** «08:00:00» → «08:00», để hiện lên màn hình cho gọn */
export function gioNgan(gio: string): string {
  return gio.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Mốc kỳ báo cáo
// ---------------------------------------------------------------------------

export type KyBaoCao = 'TUAN' | 'THANG';

export interface KhoangKy { tu: string; den: string; nhan: string }

const hai = (n: number) => String(n).padStart(2, '0');
const chuoi = (d: Date) => `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;

function homNayVn(moc: Date): Date {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return new Date(vn.getFullYear(), vn.getMonth(), vn.getDate());
}

/**
 * Khoảng ngày của một kỳ báo cáo, lùi `lui` kỳ so với hiện tại.
 *
 * Tuần bắt đầu THỨ HAI — trùng mốc tuần của Kanban 38 skill (`getVietnamWeekStart`)
 * và của bằng chứng dấu ấn, để ba nơi không lệch tuần nhau. Lệch tuần là kiểu
 * lỗi khó phát hiện nhất: mọi con số đều hợp lý, chỉ là của tuần khác.
 */
export function khoangKy(ky: KyBaoCao, lui = 0, moc: Date = new Date()): KhoangKy {
  const hom = homNayVn(moc);

  if (ky === 'TUAN') {
    const thu = hom.getDay();          // 0 = CN
    const lechVeThuHai = thu === 0 ? 6 : thu - 1;
    const dau = new Date(hom.getFullYear(), hom.getMonth(), hom.getDate() - lechVeThuHai - lui * 7);
    const cuoi = new Date(dau.getFullYear(), dau.getMonth(), dau.getDate() + 6);
    return {
      tu: chuoi(dau),
      den: chuoi(cuoi),
      nhan: lui === 0 ? 'Tuần này' : lui === 1 ? 'Tuần trước' : `${lui} tuần trước`,
    };
  }

  const dau = new Date(hom.getFullYear(), hom.getMonth() - lui, 1);
  const cuoi = new Date(dau.getFullYear(), dau.getMonth() + 1, 0);
  return {
    tu: chuoi(dau),
    den: chuoi(cuoi),
    nhan: lui === 0 ? 'Tháng này' : `Tháng ${dau.getMonth() + 1}/${dau.getFullYear()}`,
  };
}

/** «30/04 – 03/05» cho tiêu đề bảng */
export function nhanKhoangKy(k: KhoangKy): string {
  const [, m1, d1] = k.tu.split('-');
  const [, m2, d2] = k.den.split('-');
  return `${d1}/${m1} – ${d2}/${m2}`;
}
