import { describe, expect, it } from 'vitest';
import { phiMoiTin, tinhTrangToken } from '../QuanTriZaloPage';
import { phanTram } from '../QuanTriPushPage';

// Ba hàm thuần của hai trang quản trị — con số hiện lên thẻ tổng quan phải đúng,
// vì Giám đốc quyết «thêm loại tin mới» hay «gia hạn gói Zalo» dựa trên chúng.

describe('phanTram', () => {
  it('mẫu bằng 0 thì trả 0, không NaN', () => {
    expect(phanTram(5, 0)).toBe(0);
  });
  it('làm tròn tới số nguyên', () => {
    expect(phanTram(1, 3)).toBe(33);
    expect(phanTram(2, 3)).toBe(67);
    expect(phanTram(71, 100)).toBe(71);
  });
});

describe('tinhTrangToken', () => {
  const bayGio = Date.parse('2026-09-12T08:00:00Z');
  it('chưa có mốc hết hạn → chưa có token', () => {
    expect(tinhTrangToken(null, bayGio).ma).toBe('chua_co');
  });
  it('đã qua mốc → hết hạn', () => {
    expect(tinhTrangToken('2026-09-12T07:59:00Z', bayGio).ma).toBe('het');
  });
  it('dưới 7 giờ (ngưỡng cron gia hạn) → sắp hết', () => {
    expect(tinhTrangToken('2026-09-12T14:00:00Z', bayGio).ma).toBe('sap_het');
  });
  it('trên 7 giờ → tốt, kèm số giờ còn lại', () => {
    const kq = tinhTrangToken('2026-09-13T09:00:00Z', bayGio);
    expect(kq.ma).toBe('tot');
    expect(kq.nhan).toBe('Còn 25 giờ');
  });
});

describe('phiMoiTin', () => {
  it('chưa điền phí hoặc chưa gửi tin → null, không chia cho 0', () => {
    expect(phiMoiTin(null, 10)).toBeNull();
    expect(phiMoiTin(990000, 0)).toBeNull();
  });
  it('phí gói chia đều cho số tin gửi thành công, làm tròn đồng', () => {
    expect(phiMoiTin(990000, 33)).toBe(30000);
    expect(phiMoiTin(1000000, 3)).toBe(333333);
  });
});
