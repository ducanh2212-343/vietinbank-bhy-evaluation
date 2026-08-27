/**
 * KIỂM ẢNH TRƯỚC KHI TẢI LÊN.
 *
 * VÌ SAO CÓ: hai kho `avatars` và `skill-images` là kho CÔNG KHAI — ai có đường dẫn là
 * xem được, không cần đăng nhập. Trước đây phần tải lên chỉ kiểm dung lượng, không kiểm
 * loại tệp, và lấy đuôi tệp từ CHÍNH TÊN NGƯỜI DÙNG ĐẶT. Nghĩa là tải lên được tệp
 * .html/.svg tuỳ ý rồi có một địa chỉ công khai nằm trên hạ tầng gắn với ngân hàng —
 * mồi lừa đảo rất sẵn.
 *
 * Kho đã được siết ở phía máy chủ (allowed_mime_types). Kiểm ở đây để cán bộ nhận câu
 * báo lỗi TIẾNG VIỆT dễ hiểu, thay vì một lỗi thô từ dịch vụ lưu trữ.
 *
 * VÌ SAO DANH SÁCH CÓ heic/heif: ảnh chụp bằng iPhone mặc định là hai định dạng này.
 * Bỏ chúng ra là chặn luôn phần lớn cán bộ đổi ảnh đại diện bằng điện thoại.
 */

/** Giữ TRÙNG với allowed_mime_types của kho avatars/skill-images trên Supabase. */
export const LOAI_ANH_CHO_PHEP = [
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

/** Đuôi tệp suy từ LOẠI ẢNH THẬT, không lấy từ tên tệp người dùng đặt. */
const DUOI_THEO_LOAI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/** Một số máy/trình duyệt không điền file.type — suy tạm từ đuôi tên tệp. */
const LOAI_THEO_DUOI: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

/**
 * Kiểu PHẲNG (không dùng union phân biệt) là cố ý: repo bật `strict: false`, ở chế độ đó
 * TypeScript không thu hẹp được `if (!kq.ok)` thành nhánh có `loi`, khiến mọi nơi gọi
 * phải ép kiểu lằng nhằng. Phẳng thì nơi gọi đọc thẳng, không bẫy.
 */
export interface KetQuaKiemAnh {
  ok: boolean;
  /** Loại ảnh thật đã xác định (rỗng khi ok = false). */
  loai: string;
  /** Đuôi tệp suy từ loại ảnh thật (rỗng khi ok = false). */
  duoi: string;
  /** Câu báo lỗi tiếng Việt cho cán bộ (rỗng khi ok = true). */
  loi: string;
}

export function kiemAnhTaiLen(
  file: { name: string; type?: string; size?: number },
  gioiHanByte = 4 * 1024 * 1024,
): KetQuaKiemAnh {
  if (typeof file.size === 'number' && file.size > gioiHanByte) {
    return { ok: false, loai: '', duoi: '', loi: `Ảnh tối đa ${Math.round(gioiHanByte / (1024 * 1024))}MB` };
  }

  let loai = (file.type || '').toLowerCase().trim();
  if (!loai) {
    const duoiTen = (file.name.split('.').pop() || '').toLowerCase();
    loai = LOAI_THEO_DUOI[duoiTen] ?? '';
  }

  const duoi = DUOI_THEO_LOAI[loai];
  if (!duoi) {
    return {
      ok: false,
      loai: '',
      duoi: '',
      loi: 'Chỉ nhận ảnh JPG, PNG, WEBP, GIF hoặc HEIC. Hãy chọn một tấm ảnh khác.',
    };
  }
  return { ok: true, loai, duoi, loi: '' };
}
