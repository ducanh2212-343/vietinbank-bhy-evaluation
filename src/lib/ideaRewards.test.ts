process.env.TZ = 'Asia/Ho_Chi_Minh';

import { describe, it, expect } from 'vitest';
import {
  DON_GIA_CAP,
  NGAN_SACH_CHU_KY,
  TRAN_UOM_MAM_MOI_TUAN,
  dauTuan,
  dienGiaiTien,
  kiemTraThoiGian,
  kiemTraTruocKhiDuyet,
  suatUomMamConLai,
  thuHangCap,
  thuongLuyKe,
  tinhHinhNganSach,
} from './ideaRewards';

describe('thuongLuyKe — thưởng cộng dồn các cấp chưa từng nhận', () => {
  it('đi tuần tự: mỗi lần chỉ nhận đúng một mức', () => {
    expect(thuongLuyKe([], 'Ươm mầm')).toMatchObject({ min: 100_000, max: 100_000, laVuotCap: false });
    expect(thuongLuyKe(['Ươm mầm'], 'Bén rễ')).toMatchObject({ min: 300_000, max: 300_000, laVuotCap: false });
    expect(thuongLuyKe(['Ươm mầm', 'Bén rễ'], 'Vươn cành')).toMatchObject({ min: 1_000_000, max: 1_000_000 });
    expect(thuongLuyKe(['Ươm mầm', 'Bén rễ', 'Vươn cành'], 'Lan tỏa'))
      .toMatchObject({ min: 2_000_000, max: 3_000_000, laVuotCap: false });
  });

  it('vượt thẳng lên Lan tỏa từ đầu → gộp cả 4 cấp = 3,4–4,4 triệu', () => {
    const kq = thuongLuyKe([], 'Lan tỏa');
    expect(kq.cacCapDuocThuong).toEqual(['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa']);
    expect(kq.min).toBe(3_400_000);
    expect(kq.max).toBe(4_400_000);
    expect(kq.laVuotCap).toBe(true);
  });

  it('đã Ươm mầm, vượt thẳng Vươn cành → gộp Bén rễ + Vươn cành = 1,3 triệu', () => {
    const kq = thuongLuyKe(['Ươm mầm'], 'Vươn cành');
    expect(kq.cacCapDuocThuong).toEqual(['Bén rễ', 'Vươn cành']);
    expect(kq.min).toBe(1_300_000);
    expect(kq.laVuotCap).toBe(true);
  });

  it('đã Vươn cành, kỳ sau lên Lan tỏa → chỉ thưởng THÊM mức Lan tỏa', () => {
    const kq = thuongLuyKe(['Ươm mầm', 'Bén rễ', 'Vươn cành'], 'Lan tỏa');
    expect(kq.cacCapDuocThuong).toEqual(['Lan tỏa']);
    expect(kq.min).toBe(2_000_000);
  });

  it('không trả trùng cấp đã thưởng', () => {
    expect(thuongLuyKe(['Ươm mầm', 'Bén rễ'], 'Bén rễ'))
      .toMatchObject({ cacCapDuocThuong: [], min: 0, max: 0 });
  });

  it('tổng 4 cấp khớp đơn giá quy chế', () => {
    const tongMin = Object.values(DON_GIA_CAP).reduce((s, d) => s + d.min, 0);
    expect(tongMin).toBe(3_400_000);
    expect(thuHangCap('Ươm mầm')).toBe(0);
    expect(thuHangCap('Lan tỏa')).toBe(3);
  });

  it('diễn giải tiền: số đơn và khoảng', () => {
    expect(dienGiaiTien(1_000_000, 1_000_000)).toBe('1.000.000đ');
    expect(dienGiaiTien(3_400_000, 4_400_000)).toBe('3.400.000–4.400.000đ');
  });
});

describe('kiemTraThoiGian — cấp cao cần thời gian thể hiện kết quả', () => {
  it('Ươm mầm và Bén rễ không đòi thời gian', () => {
    expect(kiemTraThoiGian('Ươm mầm', '2026-08-16', '2026-08-16').dat).toBe(true);
    expect(kiemTraThoiGian('Bén rễ', '2026-08-16', '2026-08-16').dat).toBe(true);
  });

  it('Vươn cành cần đủ 30 ngày pilot', () => {
    const thieu = kiemTraThoiGian('Vươn cành', '2026-08-01', '2026-08-20');
    expect(thieu.dat).toBe(false);
    expect(thieu.soNgayDaQua).toBe(19);
    expect(thieu.soNgayCanThem).toBe(11);
    expect(thieu.canhBao).toContain('còn thiếu 11 ngày');

    expect(kiemTraThoiGian('Vươn cành', '2026-08-01', '2026-08-31').dat).toBe(true);
  });

  it('Lan tỏa cần đủ 60 ngày kể từ mốc trước', () => {
    expect(kiemTraThoiGian('Lan tỏa', '2026-07-01', '2026-08-20').dat).toBe(false);
    expect(kiemTraThoiGian('Lan tỏa', '2026-06-01', '2026-08-20').dat).toBe(true);
  });

  it('đạt rồi thì không có cảnh báo', () => {
    expect(kiemTraThoiGian('Lan tỏa', '2026-01-01', '2026-08-20').canhBao).toBe('');
  });
});

describe('suatUomMamConLai — trần 2 ý tưởng/tuần/phòng', () => {
  it('chưa chọn gì → còn đủ 2 suất', () => {
    expect(suatUomMamConLai(0)).toMatchObject({ daDung: 0, conLai: 2, het: false });
  });
  it('đã chọn 1 → còn 1', () => {
    expect(suatUomMamConLai(1)).toMatchObject({ conLai: 1, het: false });
  });
  it('đã chọn đủ 2 → hết suất tuần này', () => {
    expect(suatUomMamConLai(2)).toMatchObject({ conLai: 0, het: true });
  });
  it('lỡ vượt (dữ liệu cũ) → vẫn báo hết, không âm', () => {
    expect(suatUomMamConLai(5)).toMatchObject({ conLai: 0, het: true });
  });
  it('trần đúng theo quy chế', () => {
    expect(TRAN_UOM_MAM_MOI_TUAN).toBe(2);
  });
});

describe('dauTuan — khóa đếm trần theo tuần (thứ Hai đầu tuần)', () => {
  it('giữa tuần quy về thứ Hai', () => {
    // 2026-08-20 là thứ Năm → đầu tuần 2026-08-17 (thứ Hai)
    expect(dauTuan('2026-08-20')).toBe('2026-08-17');
  });
  it('chính thứ Hai giữ nguyên', () => {
    expect(dauTuan('2026-08-17')).toBe('2026-08-17');
  });
  it('chủ nhật vẫn thuộc tuần trước đó', () => {
    // 2026-08-23 là chủ nhật → vẫn tuần bắt đầu 2026-08-17
    expect(dauTuan('2026-08-23')).toBe('2026-08-17');
  });
});

describe('tinhHinhNganSach — theo dõi 100 triệu chu kỳ', () => {
  it('chưa chi gì → còn nguyên, không cảnh báo', () => {
    const t = tinhHinhNganSach(0);
    expect(t.conLai).toBe(NGAN_SACH_CHU_KY);
    expect(t.canhBao).toBe('');
  });

  it('phần chờ duyệt được tính vào cam kết', () => {
    const t = tinhHinhNganSach(50_000_000, 20_000_000);
    expect(t.conLai).toBe(30_000_000);
    expect(t.tyLeDaDung).toBeCloseTo(0.7, 10);
    expect(t.sapHet).toBe(false);
  });

  it('chạm 80% → cảnh báo sớm', () => {
    const t = tinhHinhNganSach(80_000_000);
    expect(t.sapHet).toBe(true);
    expect(t.canhBao).toContain('80%');
  });

  it('vượt trần → nêu hướng xử lý theo quy chế', () => {
    const t = tinhHinhNganSach(105_000_000);
    expect(t.vuotTran).toBe(true);
    expect(t.conLai).toBe(-5_000_000);
    expect(t.canhBao).toContain('chuyển ý tưởng sang kỳ xét sau');
  });
});

describe('kiemTraTruocKhiDuyet — gác từng khoản duyệt', () => {
  it('còn đủ thì cho qua, không phiền người duyệt', () => {
    expect(kiemTraTruocKhiDuyet(3_000_000, 10_000_000)).toMatchObject({ du: true, canhBao: '' });
  });

  it('không đủ thì cảnh báo kèm hướng xử lý, KHÔNG chặn cứng', () => {
    const kq = kiemTraTruocKhiDuyet(5_000_000, 98_000_000);
    expect(kq.du).toBe(false);
    expect(kq.canhBao).toContain('vượt phần ngân sách còn lại');
  });

  it('tính cả phần đang chờ duyệt', () => {
    expect(kiemTraTruocKhiDuyet(3_000_000, 90_000_000, 8_000_000).du).toBe(false);
  });
});
