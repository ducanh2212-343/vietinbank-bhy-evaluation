import { afterEach, describe, expect, it } from 'vitest';
import { datLichNghi, gopThanhKy, nhanKhoangNgay, xoaLichNghi, type NgayNghi } from './lichNghi';
import { laNgayLamViec, soNgayLamViec, tuoiCho } from './ct2';
import { hsTuoiCho } from './ct2TinDung';

/**
 * Lịch nghỉ lễ phải ăn thẳng vào mọi đồng hồ đếm ngày làm việc. Đây là phần dễ
 * quên nhất: nhập lịch xong mà con số trên bảng không đổi thì công nhập là vô
 * nghĩa.
 */

afterEach(() => xoaLichNghi());

// Kỳ nghỉ 30/4–03/5/2026 (30/4 là thứ Năm) + đi làm bù thứ Bảy 09/5
const KY_30_4: Array<Pick<NgayNghi, 'ngay' | 'loai'>> = [
  { ngay: '2026-04-30', loai: 'NGHI' },
  { ngay: '2026-05-01', loai: 'NGHI' },
  { ngay: '2026-05-02', loai: 'NGHI' },
  { ngay: '2026-05-03', loai: 'NGHI' },
  { ngay: '2026-05-09', loai: 'LAM_BU' },
];

describe('Lịch nghỉ ăn vào phép đếm ngày làm việc', () => {
  it('chưa nhập lịch thì chỉ trừ thứ Bảy và Chủ nhật', () => {
    // 27/4 (T2) → 04/5 (T2): 28, 29, 30, 1, 4 = 5 ngày làm việc
    expect(soNgayLamViec('2026-04-27T09:00:00+07:00', new Date('2026-05-04T09:00:00+07:00'))).toBe(5);
  });

  it('nhập kỳ nghỉ xong thì đồng hồ ngắn lại đúng số ngày đã nghỉ', () => {
    datLichNghi(KY_30_4);
    // Còn lại 28, 29 và 4 = 3 ngày làm việc
    expect(soNgayLamViec('2026-04-27T09:00:00+07:00', new Date('2026-05-04T09:00:00+07:00'))).toBe(3);
  });

  it('ngày đi làm bù được tính là ngày làm việc dù rơi vào thứ Bảy', () => {
    datLichNghi(KY_30_4);
    // 08/5 (T6) → 11/5 (T2): bình thường chỉ có 11; thêm T7 09/5 làm bù = 2
    expect(soNgayLamViec('2026-05-08T09:00:00+07:00', new Date('2026-05-11T09:00:00+07:00'))).toBe(2);
    expect(laNgayLamViec(new Date('2026-05-09T09:00:00+07:00'))).toBe(true);
  });

  it('ngày lễ không còn là ngày làm việc', () => {
    expect(laNgayLamViec(new Date('2026-04-30T09:00:00+07:00'))).toBe(true);
    datLichNghi(KY_30_4);
    expect(laNgayLamViec(new Date('2026-04-30T09:00:00+07:00'))).toBe(false);
  });

  it('thẻ chờ vắt qua kỳ nghỉ lễ KHÔNG bị báo nghẽn oan', () => {
    const the = { trang_thai: 'CHO_DUYET' as const, giu_tu: '2026-04-29T16:00:00+07:00' };
    // Chưa có lịch nghỉ: 30/4, 1/5, 4/5 → 3 ngày, chạm ngưỡng escalate
    expect(tuoiCho(the, new Date('2026-05-04T09:00:00+07:00'))).toBe(3);
    // Có lịch nghỉ: người giữ mới có đúng 1 ngày làm việc để xử lý
    datLichNghi(KY_30_4);
    expect(tuoiCho(the, new Date('2026-05-04T09:00:00+07:00'))).toBe(1);
  });

  it('hồ sơ tín dụng cũng dùng chung lịch nghỉ', () => {
    const hs = { trang_thai: 'TRINH_LDCN' as const, giu_tu: '2026-04-29T16:00:00+07:00' };
    expect(hsTuoiCho(hs, new Date('2026-05-04T09:00:00+07:00'))).toBe(3);
    datLichNghi(KY_30_4);
    expect(hsTuoiCho(hs, new Date('2026-05-04T09:00:00+07:00'))).toBe(1);
  });

  it('nghỉ trọn một tuần thì không còn ngày làm việc nào', () => {
    datLichNghi([
      { ngay: '2026-02-16', loai: 'NGHI' }, { ngay: '2026-02-17', loai: 'NGHI' },
      { ngay: '2026-02-18', loai: 'NGHI' }, { ngay: '2026-02-19', loai: 'NGHI' },
      { ngay: '2026-02-20', loai: 'NGHI' },
    ]);
    expect(soNgayLamViec('2026-02-13T09:00:00+07:00', new Date('2026-02-22T09:00:00+07:00'))).toBe(0);
  });
});

describe('Gộp ngày rời thành kỳ nghỉ để hiển thị', () => {
  const ds: NgayNghi[] = [
    { id: '1', ngay: '2026-05-01', loai: 'NGHI', ten: 'Nghỉ 30/4 - 1/5', nhom_id: 'a', ma_moc: 'GIAI_PHONG', ghi_chu: null },
    { id: '2', ngay: '2026-04-30', loai: 'NGHI', ten: 'Nghỉ 30/4 - 1/5', nhom_id: 'a', ma_moc: 'GIAI_PHONG', ghi_chu: null },
    { id: '3', ngay: '2026-05-09', loai: 'LAM_BU', ten: 'Đi làm bù', nhom_id: 'b', ma_moc: null, ghi_chu: null },
  ];

  it('gộp theo nhóm, lấy đúng ngày đầu và ngày cuối', () => {
    const ky = gopThanhKy(ds);
    expect(ky).toHaveLength(2);
    expect(ky[0]).toMatchObject({ tu: '2026-04-30', den: '2026-05-01', so_ngay: 2, loai: 'NGHI' });
    expect(ky[1]).toMatchObject({ tu: '2026-05-09', den: '2026-05-09', so_ngay: 1, loai: 'LAM_BU' });
  });

  it('nhãn khoảng ngày đọc được, không lặp thừa tháng/năm', () => {
    expect(nhanKhoangNgay('2026-05-09', '2026-05-09')).toBe('09/05/2026');
    expect(nhanKhoangNgay('2026-04-30', '2026-05-03')).toBe('30/04 – 03/05/2026');
    expect(nhanKhoangNgay('2026-12-30', '2027-01-02')).toBe('30/12/2026 – 02/01/2027');
  });
});
