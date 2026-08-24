import { describe, it, expect, beforeEach, vi } from 'vitest';
import { donDuLieuCaNhanTrenMay, TIEN_TO_CHAN_DUNG_AI, TEN_DB_KY_YEU } from '../donDuLieuCaNhan';
import { QUICK_NOTE_DRAFT_KEY } from '../hanhVi';

/**
 * Máy ở chi nhánh là máy dùng chung: đăng xuất mà còn để lại nhận xét về đồng nghiệp
 * hay chân dung năng lực của người trước là sự cố về quyền riêng tư, không phải lỗi vặt.
 */
describe('Dọn dấu vết cá nhân khi đăng xuất', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('xoá bản nháp ghi chú hành vi và mọi chân dung năng lực AI', () => {
    localStorage.setItem(QUICK_NOTE_DRAFT_KEY, JSON.stringify({ noiDung: 'nhận xét về anh A' }));
    localStorage.setItem(`${TIEN_TO_CHAN_DUNG_AI}phieu-1`, 'chân dung 1');
    localStorage.setItem(`${TIEN_TO_CHAN_DUNG_AI}phieu-2`, 'chân dung 2');
    localStorage.setItem(`${TIEN_TO_CHAN_DUNG_AI}phieu-3`, 'chân dung 3');

    donDuLieuCaNhanTrenMay();

    expect(localStorage.getItem(QUICK_NOTE_DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(`${TIEN_TO_CHAN_DUNG_AI}phieu-1`)).toBeNull();
    // Bẫy kinh điển: xoá ngay trong vòng lặp làm chỉ số dồn lên và bỏ sót khoá ở giữa.
    expect(localStorage.getItem(`${TIEN_TO_CHAN_DUNG_AI}phieu-2`)).toBeNull();
    expect(localStorage.getItem(`${TIEN_TO_CHAN_DUNG_AI}phieu-3`)).toBeNull();
  });

  it('giữ nguyên tuỳ chọn giao diện — xoá sạch thì cán bộ phải chỉnh lại mỗi lần đăng nhập', () => {
    localStorage.setItem('vtb-theme', 'dark');
    localStorage.setItem('bhy-nav-folders', '["a"]');
    localStorage.setItem('bhy.phien-ban.da-xem', '1.2.3');

    donDuLieuCaNhanTrenMay();

    expect(localStorage.getItem('vtb-theme')).toBe('dark');
    expect(localStorage.getItem('bhy-nav-folders')).toBe('["a"]');
    expect(localStorage.getItem('bhy.phien-ban.da-xem')).toBe('1.2.3');
  });

  it('xoá kho PDF kỷ yếu đã tải', () => {
    const xoa = vi.fn();
    vi.stubGlobal('indexedDB', { deleteDatabase: xoa });
    donDuLieuCaNhanTrenMay();
    expect(xoa).toHaveBeenCalledWith(TEN_DB_KY_YEU);
    vi.unstubAllGlobals();
  });

  it('không ném lỗi khi trình duyệt chặn lưu trữ — đăng xuất phải luôn chạy được', () => {
    vi.stubGlobal('indexedDB', {
      deleteDatabase: () => { throw new Error('bị chặn'); },
    });
    expect(() => donDuLieuCaNhanTrenMay()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
