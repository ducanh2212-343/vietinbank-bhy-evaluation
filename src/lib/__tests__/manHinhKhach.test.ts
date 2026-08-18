import { describe, it, expect } from 'vitest';
import {
  MAN_HINH_KHACH,
  MAN_HINH_KHACH_MAC_DINH,
  MA_MAN_HINH_KHACH,
  chuanHoaManHinhKhach,
  khachXemDuoc,
  manHinhCuaDuongDan,
} from '../manHinhKhach';

/**
 * Danh mục màn hình mở cho khách đối tác là nơi DUY NHẤT quyết định khách vào
 * được đường dẫn nào. Sai ở đây là hoặc khóa nhầm đối tác ngoài cửa, hoặc tệ
 * hơn — mở một màn nghiệp vụ nội bộ cho người ngoài — nên khóa bằng test.
 */
describe('Danh mục màn hình mở cho khách', () => {
  it('mã không trùng nhau và mọi màn hình đều có đường dẫn', () => {
    expect(new Set(MA_MAN_HINH_KHACH).size).toBe(MA_MAN_HINH_KHACH.length);
    for (const m of MAN_HINH_KHACH) {
      expect(m.duongDan.length).toBeGreaterThan(0);
      for (const d of m.duongDan) expect(d.startsWith('/')).toBe(true);
    }
  });

  it('một đường dẫn chỉ thuộc đúng một màn hình', () => {
    const tatCa = MAN_HINH_KHACH.flatMap((m) => m.duongDan);
    expect(new Set(tatCa).size).toBe(tatCa.length);
  });

  it('mặc định giữ đúng bộ màn hình khách vẫn xem được trước khi có ô chọn', () => {
    expect(MAN_HINH_KHACH_MAC_DINH).toEqual(['trang-chu', 'tin-tuc', 'sharing', 'connect']);
  });

  it('chỉ mở màn hình cổng ONE — không có đường dẫn nghiệp vụ nào lọt vào danh mục', () => {
    for (const d of MAN_HINH_KHACH.flatMap((m) => m.duongDan)) {
      expect(d === '/one' || d.startsWith('/one/'), `${d} nằm ngoài cổng ONE`).toBe(true);
    }
    // Ba màn nghiệp vụ của Ideas không bao giờ mở được cho khách
    for (const cam of ['/one/y-tuong/gui', '/one/y-tuong/hoi-dong', '/one/y-tuong/van-hanh']) {
      expect(manHinhCuaDuongDan(cam)).toBeNull();
    }
  });

  it('chuẩn hóa: bỏ mã lạ, khử trùng lặp, luôn kèm Trang chủ', () => {
    expect(chuanHoaManHinhKhach(['tin-tuc'])).toEqual(['trang-chu', 'tin-tuc']);
    expect(chuanHoaManHinhKhach(['tin-tuc', 'tin-tuc'])).toEqual(['trang-chu', 'tin-tuc']);
    expect(chuanHoaManHinhKhach(['man-hinh-khong-co'])).toEqual(['trang-chu']);
    expect(chuanHoaManHinhKhach(null)).toEqual(['trang-chu']);
    // Giữ đúng thứ tự danh mục, không theo thứ tự lưu trong cơ sở dữ liệu
    expect(chuanHoaManHinhKhach(['connect', 'tin-tuc'])).toEqual(['trang-chu', 'tin-tuc', 'connect']);
  });

  it('vào được đúng màn đã mở, và luôn vào được Trang chủ lẫn trang đổi mật khẩu', () => {
    const cho = MAN_HINH_KHACH_MAC_DINH;
    expect(khachXemDuoc('/one', cho)).toBe(true);
    expect(khachXemDuoc('/one/hoc-hoi', cho)).toBe(true);
    expect(khachXemDuoc('/doi-mat-khau', [])).toBe(true);
    expect(khachXemDuoc('/one', [])).toBe(true);
  });

  it('fail-closed: màn chưa mở, route con và trang ngoài cổng đều bị chặn', () => {
    const cho = MAN_HINH_KHACH_MAC_DINH;
    expect(khachXemDuoc('/one/cay-ky-uc', cho)).toBe(false);
    expect(khachXemDuoc('/one/chieu-thuc-2', cho)).toBe(false);
    expect(khachXemDuoc('/tong-quan', cho)).toBe(false);
    expect(khachXemDuoc('/quizzi', cho)).toBe(false);
    // Mở trang giới thiệu Ideas KHÔNG kéo theo các màn nghiệp vụ bên dưới
    const coIdeas = [...cho, 'ideas'];
    expect(khachXemDuoc('/one/y-tuong', coIdeas)).toBe(true);
    expect(khachXemDuoc('/one/y-tuong/gui', coIdeas)).toBe(false);
    expect(khachXemDuoc('/one/y-tuong/hoi-dong', coIdeas)).toBe(false);
  });

  it('thẻ Bắc Hưng Yên Ways gắn với màn hình đều dùng mã thẻ có thật', () => {
    // Trang chủ lọc dải thẻ theo wayId; gõ sai là thẻ biến mất không báo lỗi
    const maThe = ['sharing', 'quizzi', 'ideas', 'connect', 'sao-xung-dang', 'credit-360'];
    for (const m of MAN_HINH_KHACH) {
      if (m.wayId) expect(maThe, `wayId "${m.wayId}" không có trong BHY_WAYS`).toContain(m.wayId);
    }
  });
});
