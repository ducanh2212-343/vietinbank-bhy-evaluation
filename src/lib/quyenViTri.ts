/**
 * QUYỀN ĐỊNH VỊ CỦA TRÌNH DUYỆT (Giám đốc 07/09/2026: «cần có nút chuyển sang
 * chế độ cho phép mở định vị của các nền tảng iOS, Android»).
 *
 * Web KHÔNG có cách nào tự bật quyền định vị hộ người dùng — đó là chốt an toàn
 * của cả iOS lẫn Android, không phải thiếu sót của cổng. Thứ làm được, và là
 * thứ thực sự gỡ được cho cán bộ đang đứng ở phòng học, gồm ba phần:
 *
 *   1. Nhận ra bị CHẶN QUYỀN (khác với bắt sóng chậm hay máy không hỗ trợ) —
 *      vì ba lỗi này cần ba cách xử lý khác hẳn nhau.
 *   2. Chỉ đúng đường đi trong Cài đặt của MÁY ĐANG CẦM. Một dòng «vào cài đặt
 *      trình duyệt» chung chung là thứ khiến người ta bỏ cuộc: trên iPhone quyền
 *      nằm ở Cài đặt của máy chứ không nằm trong Safari.
 *   3. Cho bấm lại NGAY TẠI CHỖ sau khi bật, không phải tải lại trang — iOS hỏi
 *      quyền lại ở lần gọi kế tiếp.
 */

export type NenTang = 'IOS' | 'ANDROID' | 'MAY_TINH';

/** Mã lỗi để giao diện biết hiện hướng dẫn nào — chuỗi lỗi trần không đủ */
export type MaLoiViTri = 'TU_CHOI' | 'HET_GIO' | 'KHONG_HO_TRO' | 'KHAC';

export class LoiViTri extends Error {
  constructor(public ma: MaLoiViTri, message: string) {
    super(message);
    this.name = 'LoiViTri';
  }
}

/**
 * iPad đời mới báo userAgent y hệt máy Mac, chỉ khác ở chỗ có cảm ứng — nên phải
 * xét thêm maxTouchPoints, nếu không cán bộ dùng iPad sẽ nhận hướng dẫn của máy
 * tính và không tìm thấy mục nào như thế.
 */
export function nenTangThietBi(ua: string, coCamUng = false): NenTang {
  if (/android/i.test(ua)) return 'ANDROID';
  if (/iphone|ipad|ipod/i.test(ua)) return 'IOS';
  if (/macintosh/i.test(ua) && coCamUng) return 'IOS';
  return 'MAY_TINH';
}

export function nenTangHienTai(): NenTang {
  if (typeof navigator === 'undefined') return 'MAY_TINH';
  return nenTangThietBi(navigator.userAgent, (navigator.maxTouchPoints ?? 0) > 1);
}

export interface HuongDanQuyen {
  tieuDe: string;
  buoc: string[];
}

/** Các bước bật lại quyền, viết đúng tên mục mà cán bộ sẽ thấy trên máy mình */
export function huongDanMoDinhVi(nt: NenTang): HuongDanQuyen {
  if (nt === 'IOS') {
    return {
      tieuDe: 'Trên iPhone / iPad',
      buoc: [
        'Mở Cài đặt của máy → Quyền riêng tư & Bảo mật → Dịch vụ định vị: bật lên',
        'Vẫn trong Cài đặt → kéo xuống tìm Safari (hoặc trình duyệt đang dùng) → Vị trí → chọn «Khi dùng ứng dụng»',
        'Quay lại trang này, bấm «Cho phép định vị» rồi chọn Cho phép',
      ],
    };
  }
  if (nt === 'ANDROID') {
    return {
      tieuDe: 'Trên điện thoại Android',
      buoc: [
        'Kéo thanh thông báo xuống, bật biểu tượng Vị trí (GPS)',
        'Bấm biểu tượng ổ khoá cạnh địa chỉ trang → Quyền → Vị trí → Cho phép',
        'Nếu không thấy mục đó: Cài đặt máy → Ứng dụng → Chrome → Quyền → Vị trí → Cho phép',
        'Quay lại trang này, bấm «Cho phép định vị»',
      ],
    };
  }
  return {
    tieuDe: 'Trên máy tính',
    buoc: [
      'Bấm biểu tượng ổ khoá cạnh địa chỉ trang → Vị trí → Cho phép',
      'Bấm «Cho phép định vị» ngay dưới đây',
      'Máy tính bàn thường không có GPS nên sai số lớn — nên dùng điện thoại, hoặc quét mã QR trong phòng học',
    ],
  };
}

/**
 * Đọc trạng thái quyền TRƯỚC khi bấm, để hiện sẵn hướng dẫn thay vì bắt người
 * dùng bấm một lần thất bại rồi mới biết. Safari cũ không có Permissions API và
 * Firefox không cho hỏi 'geolocation' — trả 'khong_ro' để giao diện im lặng chứ
 * không đoán bừa là đã bị chặn.
 */
export async function trangThaiQuyenViTri(): Promise<'cho_phep' | 'tu_choi' | 'se_hoi' | 'khong_ro'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'khong_ro';
  try {
    const kq = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return kq.state === 'granted' ? 'cho_phep' : kq.state === 'denied' ? 'tu_choi' : 'se_hoi';
  } catch {
    return 'khong_ro';
  }
}
