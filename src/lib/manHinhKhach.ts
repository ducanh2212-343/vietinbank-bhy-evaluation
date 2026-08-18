/**
 * DANH MỤC MÀN HÌNH MỞ CHO KHÁCH ĐỐI TÁC.
 *
 * Trước đây quyền xem của khách bị đóng cứng trong mã nguồn (cờ `guestVisible`
 * của cây điều hướng), nên mở thêm một màn hình cho đối tác là phải sửa code và
 * phát hành lại. Nay mỗi tài khoản khách mang một danh sách mã màn hình
 * (`guest_access.allowed_screens`); Phòng TCTH tự chọn ở màn «Quản trị tài khoản
 * khách».
 *
 * File này là NGUỒN DUY NHẤT cho: hộp chọn ở màn quản trị, chốt chặn điều hướng
 * (GuestGate), bộ lọc cây menu và dải thẻ Bắc Hưng Yên Ways trên Trang chủ.
 * Bản sao rút gọn cho phía máy chủ nằm ở supabase/functions/_shared/guestScreens.ts
 * và ràng buộc CHECK của bảng — ba nơi phải cùng một bộ mã.
 *
 * Nguyên tắc fail-closed giữ nguyên: đường dẫn không nằm trong danh mục thì
 * khách KHÔNG vào được, dù route mới thêm sau này có nằm trong /one.
 */

export type MaManHinhKhach =
  | 'trang-chu'
  | 'tin-tuc'
  | 'sharing'
  | 'connect'
  | 'cay-ky-uc'
  | 'ghi-nhan'
  | 'credit-360'
  | 'ideas'
  | 'bhy-3806';

export interface ManHinhKhach {
  id: MaManHinhKhach;
  ten: string;
  /** Một câu giải thích khách sẽ thấy gì — hiện ngay dưới hộp chọn */
  moTa: string;
  /**
   * Các đường dẫn thuộc màn hình này. So khớp CHÍNH XÁC (không theo tiền tố):
   * /one/y-tuong mở cho khách không kéo theo /one/y-tuong/gui hay /van-hanh.
   */
  duongDan: string[];
  /** Bắt buộc — Trang chủ là cửa vào, không tắt được */
  batBuoc?: boolean;
  /** Mã thẻ trong dải Bắc Hưng Yên Ways trên Trang chủ (nếu có) */
  wayId?: string;
}

export const MAN_HINH_KHACH: ManHinhKhach[] = [
  {
    id: 'trang-chu',
    ten: 'Trang chủ ONE',
    moTa: 'Cửa vào cổng: lời chào, bản sắc 20 năm và giới thiệu hệ sinh thái Bắc Hưng Yên Ways.',
    // Ba đường dẫn sau là link cũ đã chuyển hướng về trang chủ
    duongDan: ['/one', '/one/nguon-coi', '/one/dac-trung', '/one/chieu-thuc'],
    batBuoc: true,
  },
  {
    id: 'tin-tuc',
    ten: 'Tin tức nội bộ',
    moTa: 'Dòng tin của Chi nhánh. Khách chỉ đọc được tin đã đánh dấu «Chia sẻ đối tác».',
    duongDan: ['/one/tin-tuc'],
  },
  {
    id: 'sharing',
    ten: 'Bắc Hưng Yên Sharing',
    moTa: 'Kho tri thức dùng chung. Khách chỉ thấy tư liệu đã đánh dấu «Chia sẻ đối tác».',
    duongDan: ['/one/hoc-hoi', '/one/kho-du-lieu'],
    wayId: 'sharing',
  },
  {
    id: 'connect',
    ten: 'Bắc Hưng Yên Connect',
    moTa: 'Chuỗi hội nghị khách hàng và kết nối hệ sinh thái doanh nghiệp trên địa bàn.',
    duongDan: ['/one/bhy-connect'],
    wayId: 'connect',
  },
  {
    id: 'cay-ky-uc',
    ten: 'Cây Ký Ức',
    moTa: 'Kỷ yếu số 20 năm dạng sách lật. Có ảnh tập thể và lưu bút nội bộ — cân nhắc khi mở.',
    duongDan: ['/one/cay-ky-uc', '/one/ky-yeu-so'],
  },
  {
    id: 'ghi-nhan',
    ten: 'Sao Xứng Đáng',
    moTa: 'Giới thiệu chương trình ghi nhận. Ô gửi sao và phân tích nội bộ vẫn ẩn với khách.',
    duongDan: ['/one/ghi-nhan'],
    wayId: 'sao-xung-dang',
  },
  {
    id: 'credit-360',
    ten: 'Bắc Hưng Yên Credit 360',
    moTa: 'Phần giới thiệu phương thức thẩm định đa chiều. Sổ phiên họp vẫn ẩn với khách.',
    duongDan: ['/one/credit-360'],
    wayId: 'credit-360',
  },
  {
    id: 'ideas',
    ten: 'Bắc Hưng Yên Ideas',
    moTa: 'Trang giới thiệu chương trình sáng kiến. Ô gửi, bảng theo dõi và chấm điểm vẫn ẩn.',
    duongDan: ['/one/y-tuong'],
    wayId: 'ideas',
  },
  {
    id: 'bhy-3806',
    ten: 'Khung năng lực 3806',
    moTa: '38 kỹ năng lõi và 06 nhóm thái độ — nội dung giới thiệu, không kèm dữ liệu cán bộ.',
    duongDan: ['/one/bhy-3806'],
  },
];

/** Mặc định khi cấp tài khoản mới — đúng bộ màn hình khách vẫn được xem trước nay. */
export const MAN_HINH_KHACH_MAC_DINH: MaManHinhKhach[] = ['trang-chu', 'tin-tuc', 'sharing', 'connect'];

export const MA_MAN_HINH_KHACH: MaManHinhKhach[] = MAN_HINH_KHACH.map((m) => m.id);

const BAT_BUOC: MaManHinhKhach[] = MAN_HINH_KHACH.filter((m) => m.batBuoc).map((m) => m.id);

/**
 * Đường dẫn khách LUÔN vào được, không phụ thuộc danh sách màn hình: đổi mật
 * khẩu là việc của tài khoản chứ không phải một màn hình nội dung.
 */
export const DUONG_DAN_LUON_MO = ['/doi-mat-khau'];

/**
 * Làm sạch danh sách đọc từ cơ sở dữ liệu: bỏ mã lạ (màn hình đã gỡ), khử trùng
 * lặp, luôn kèm màn bắt buộc, và giữ đúng thứ tự của danh mục để hiển thị ổn định.
 */
export function chuanHoaManHinhKhach(ds: readonly string[] | null | undefined): MaManHinhKhach[] {
  const chon = new Set<string>([...(ds ?? []), ...BAT_BUOC]);
  return MA_MAN_HINH_KHACH.filter((id) => chon.has(id));
}

/** Khách có được vào đường dẫn này không (so khớp chính xác — fail-closed). */
export function khachXemDuoc(duongDan: string, ds: readonly string[]): boolean {
  if (DUONG_DAN_LUON_MO.includes(duongDan)) return true;
  const cho = chuanHoaManHinhKhach(ds);
  return MAN_HINH_KHACH.some((m) => cho.includes(m.id) && m.duongDan.includes(duongDan));
}

/** Mã màn hình chứa đường dẫn này (null nếu đường dẫn không mở cho khách bao giờ). */
export function manHinhCuaDuongDan(duongDan: string): MaManHinhKhach | null {
  return MAN_HINH_KHACH.find((m) => m.duongDan.includes(duongDan))?.id ?? null;
}
