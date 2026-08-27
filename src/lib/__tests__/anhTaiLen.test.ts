import { describe, it, expect } from 'vitest';
import { kiemAnhTaiLen } from '../anhTaiLen';

/**
 * Kho ảnh đại diện là kho CÔNG KHAI. Cho tải lên .html/.svg là tặng kẻ xấu một địa chỉ
 * lừa đảo nằm trên hạ tầng gắn với ngân hàng.
 */
describe('Kiểm ảnh trước khi tải lên', () => {
  it('nhận các định dạng ảnh thông thường', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(kiemAnhTaiLen({ name: 'anh.bin', type: t, size: 100 }).ok).toBe(true);
    }
  });

  it('nhận ảnh iPhone (heic/heif) — bỏ ra là chặn phần lớn cán bộ dùng điện thoại', () => {
    expect(kiemAnhTaiLen({ name: 'IMG_1.HEIC', type: 'image/heic', size: 100 }).ok).toBe(true);
  });

  it('từ chối tệp HTML/SVG dù người dùng đặt tên đuôi ảnh', () => {
    expect(kiemAnhTaiLen({ name: 'anh.jpg', type: 'text/html', size: 10 }).ok).toBe(false);
    expect(kiemAnhTaiLen({ name: 'anh.png', type: 'image/svg+xml', size: 10 }).ok).toBe(false);
  });

  it('đuôi tệp lấy từ LOẠI ẢNH THẬT, không lấy từ tên người dùng đặt', () => {
    const kq = kiemAnhTaiLen({ name: 'ke-xau.html', type: 'image/png', size: 10 });
    expect(kq.ok && kq.duoi).toBe('png');
  });

  it('trình duyệt không điền file.type thì suy từ đuôi tên tệp', () => {
    const kq = kiemAnhTaiLen({ name: 'anh.jpeg', type: '', size: 10 });
    expect(kq.ok && kq.loai).toBe('image/jpeg');
  });

  it('quá dung lượng thì báo rõ bằng tiếng Việt', () => {
    const kq = kiemAnhTaiLen({ name: 'to.jpg', type: 'image/jpeg', size: 9 * 1024 * 1024 });
    expect(kq.ok).toBe(false);
    expect(kq.ok === false && kq.loi).toContain('MB');
  });
});
