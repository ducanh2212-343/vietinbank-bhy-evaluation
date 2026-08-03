import { afterEach, describe, expect, it } from 'vitest';
import {
  CAU_HINH_MAC_DINH, cauHinhNhip, datCauHinhNhip, gioNgan, gioSangPhut,
  khoangKy, nhanKhoangKy, xoaCauHinhNhip,
} from './cauHinhNhip';
import { nguongTuoiCho, trongKhungNhip } from './ct2';
import { xoaLichNghi } from './lichNghi';

afterEach(() => { xoaCauHinhNhip(); xoaLichNghi(); });

describe('Mốc giờ nhịp đọc từ cấu hình, không còn chôn cứng', () => {
  // 12/08/2026 là thứ Tư
  const luc = (gio: string) => new Date(`2026-08-12T${gio}:00+07:00`);

  it('khung bảng sống theo mặc định 06:45–08:45', () => {
    expect(trongKhungNhip(luc('06:30'))).toBe(false);
    expect(trongKhungNhip(luc('07:30'))).toBe(true);
    expect(trongKhungNhip(luc('09:00'))).toBe(false);
  });

  it('đổi cấu hình thì khung đổi theo ngay', () => {
    datCauHinhNhip({ gio_mo_nhip: '09:00', gio_dong_nhip: '10:30' });
    expect(trongKhungNhip(luc('07:30'))).toBe(false);
    expect(trongKhungNhip(luc('09:30'))).toBe(true);
  });

  it('cuối tuần thì ngoài khung dù đang trong giờ', () => {
    // 15/08/2026 là thứ Bảy
    expect(trongKhungNhip(new Date('2026-08-15T07:30:00+07:00'))).toBe(false);
  });

  it('ngưỡng cột chờ cũng lấy từ cấu hình', () => {
    expect(nguongTuoiCho()).toBe(3);
    datCauHinhNhip({ nguong_tuoi_cho: 5 });
    expect(nguongTuoiCho()).toBe(5);
  });

  it('nạp cấu hình thiếu trường thì phần còn lại rơi về mặc định', () => {
    datCauHinhNhip({ gio_dung_gio: '07:30' });
    expect(cauHinhNhip().gio_dung_gio).toBe('07:30');
    expect(cauHinhNhip().gio_an_han).toBe(CAU_HINH_MAC_DINH.gio_an_han);
  });

  it('đọc được cả dạng có giây từ database', () => {
    expect(gioSangPhut('08:30:00')).toBe(510);
    expect(gioNgan('08:30:00')).toBe('08:30');
  });
});

describe('Mốc kỳ báo cáo tuần / tháng', () => {
  // Thứ Tư 12/08/2026
  const moc = new Date('2026-08-12T09:00:00+07:00');

  it('tuần bắt đầu THỨ HAI, trùng mốc tuần của Kanban', () => {
    const k = khoangKy('TUAN', 0, moc);
    expect(k).toMatchObject({ tu: '2026-08-10', den: '2026-08-16', nhan: 'Tuần này' });
  });

  it('chủ nhật vẫn thuộc tuần bắt đầu thứ Hai trước đó', () => {
    const k = khoangKy('TUAN', 0, new Date('2026-08-16T09:00:00+07:00'));
    expect(k.tu).toBe('2026-08-10');
  });

  it('lùi kỳ ra đúng tuần trước', () => {
    expect(khoangKy('TUAN', 1, moc)).toMatchObject({ tu: '2026-08-03', den: '2026-08-09', nhan: 'Tuần trước' });
    expect(khoangKy('TUAN', 3, moc).tu).toBe('2026-07-20');
  });

  it('tháng chạy từ ngày 1 tới ngày cuối, kể cả tháng 30 ngày', () => {
    expect(khoangKy('THANG', 0, moc)).toMatchObject({ tu: '2026-08-01', den: '2026-08-31' });
    expect(khoangKy('THANG', 2, moc)).toMatchObject({ tu: '2026-06-01', den: '2026-06-30' });
  });

  it('lùi qua ranh giới năm vẫn đúng', () => {
    const k = khoangKy('THANG', 8, moc);
    expect(k).toMatchObject({ tu: '2025-12-01', den: '2025-12-31' });
  });

  it('nhãn khoảng gọn, không lặp năm', () => {
    expect(nhanKhoangKy(khoangKy('TUAN', 0, moc))).toBe('10/08 – 16/08');
  });
});
