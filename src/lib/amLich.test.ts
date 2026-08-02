import { describe, expect, it } from 'vitest';
import {
  amSangDuong, conBaoNhieuNgay, duongSangAm, mocLeTrongNam, mocLeTrongVong,
} from './amLich';

/**
 * Neo vào các mốc Tết đã xảy ra và đã được công bố. Nếu ai đó sửa thuật toán
 * hoặc đổi múi giờ sang +8 (lịch âm Trung Quốc) thì các bài này gãy ngay — đó
 * đúng là điều cần chặn, vì lệch một ngày là lệch cả lịch trực của Chi nhánh.
 */

describe('Đổi âm lịch sang dương lịch — mùng 1 Tết các năm', () => {
  const TET: Array<[number, string]> = [
    [2023, '22/1/2023'],
    [2024, '10/2/2024'],
    [2025, '29/1/2025'],
    [2026, '17/2/2026'],
    [2027, '6/2/2027'],
    [2028, '26/1/2028'],
  ];

  it.each(TET)('Tết Nguyên đán %i rơi đúng ngày %s', (nam, mongDoi) => {
    const d = amSangDuong(1, 1, nam)!;
    expect(`${d[0]}/${d[1]}/${d[2]}`).toBe(mongDoi);
  });

  it('Giỗ Tổ Hùng Vương (mùng 10 tháng 3) tính đúng', () => {
    expect(amSangDuong(10, 3, 2025)).toEqual([7, 4, 2025]);
    expect(amSangDuong(10, 3, 2026)).toEqual([26, 4, 2026]);
  });
});

describe('Đổi ngược dương sang âm', () => {
  it('đi một vòng vẫn ra chính nó', () => {
    expect(duongSangAm(17, 2, 2026)).toEqual([1, 1, 2026, false]);
    expect(duongSangAm(26, 4, 2026)).toEqual([10, 3, 2026, false]);
    expect(duongSangAm(29, 1, 2025)).toEqual([1, 1, 2025, false]);
  });

  it('ngày dương đầu năm vẫn thuộc tháng Chạp năm âm trước', () => {
    const [, thang, nam] = duongSangAm(1, 1, 2026);
    expect(nam).toBe(2025);
    expect(thang).toBe(11);
  });
});

describe('Sáu mốc lễ trong năm', () => {
  const ds = mocLeTrongNam(2026);

  it('đủ sáu mốc và xếp theo thứ tự thời gian', () => {
    expect(ds.map((m) => m.ma)).toEqual([
      'TET_DUONG', 'TET_AM', 'GIO_TO', 'GIAI_PHONG', 'LAO_DONG', 'QUOC_KHANH',
    ]);
  });

  it('bốn mốc dương lịch neo cứng đúng ngày luật định', () => {
    const tra = (ma: string) => ds.find((m) => m.ma === ma)!.ngay;
    expect(tra('TET_DUONG')).toBe('2026-01-01');
    expect(tra('GIAI_PHONG')).toBe('2026-04-30');
    expect(tra('LAO_DONG')).toBe('2026-05-01');
    expect(tra('QUOC_KHANH')).toBe('2026-09-02');
  });
});

describe('Quét mốc lễ để nhắc quản trị', () => {
  it('bắt được mốc nằm trong khoảng 10 ngày tới', () => {
    // 20/4/2026 → trong 10 ngày có Giỗ Tổ 26/4 và 30/4
    const ds = mocLeTrongVong(new Date('2026-04-20T03:00:00Z'), 10);
    expect(ds.map((m) => m.ma)).toEqual(['GIO_TO', 'GIAI_PHONG']);
  });

  it('quét KHOẢNG chứ không đúng ngày thứ 10 — tác vụ chạy trễ vẫn bắt được', () => {
    // Chạy trễ 3 ngày (23/4) vẫn thấy Giỗ Tổ 26/4, dù lúc này chỉ còn 3 ngày
    const ds = mocLeTrongVong(new Date('2026-04-23T03:00:00Z'), 10);
    expect(ds.map((m) => m.ma)).toContain('GIO_TO');
  });

  it('nhìn sang cả năm sau — tháng 12 phải thấy Tết Dương lịch', () => {
    const ds = mocLeTrongVong(new Date('2026-12-26T03:00:00Z'), 10);
    expect(ds.map((m) => m.ngay)).toContain('2027-01-01');
  });

  it('không có mốc nào thì trả danh sách rỗng, không báo lỗi', () => {
    expect(mocLeTrongVong(new Date('2026-07-15T03:00:00Z'), 10)).toEqual([]);
  });

  it('đếm đúng số ngày còn lại tới mốc', () => {
    const gioTo = mocLeTrongNam(2026).find((m) => m.ma === 'GIO_TO')!;
    expect(conBaoNhieuNgay(gioTo, new Date('2026-04-16T03:00:00Z'))).toBe(10);
    expect(conBaoNhieuNgay(gioTo, new Date('2026-04-26T03:00:00Z'))).toBe(0);
  });
});
