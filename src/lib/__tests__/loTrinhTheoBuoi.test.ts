import { describe, it, expect } from 'vitest';
import {
  TTC_BUOI, buoiCuaViec, gioNgan, moTaThoiLuong, nhomTheoBuoi, type TtcDauViec,
} from '../trainingCenter';

// Chỉ những trường mà phép chia buổi thật sự đọc tới
const v = (bd: string, kt: string, thu_tu = 1, ten = 'việc'): TtcDauViec => ({
  id: `${bd}-${thu_tu}`, ngay_id: 'n1', phan: 'THUC_HANH', thu_tu,
  gio_bat_dau: bd, gio_ket_thuc: kt, ten, dau_ra: null,
  nguoi_phu_trach: 'HOC_VIEN', thiet_bi: 'KHONG', noi_nop: 'KHONG',
  trong_tam: false, tinh_nang: [],
} as unknown as TtcDauViec);

describe('giờ của Postgres về đúng dạng cán bộ đọc', () => {
  it("cắt 'HH:MM:SS' thành 'HH:MM'", () => {
    expect(gioNgan('08:00:00')).toBe('08:00');
    expect(gioNgan('13:30')).toBe('13:30');
  });
  it('chuỗi rỗng hoặc hỏng thì trả nguyên, không dựng chuỗi vô nghĩa', () => {
    expect(gioNgan(null)).toBe('');
    expect(gioNgan('chưa đặt')).toBe('chưa đặt');
  });
});

describe('mỗi đầu việc thuộc buổi nào', () => {
  it('trước 12h là sáng, 12h–18h là chiều, từ 18h là sau giờ làm việc', () => {
    expect(buoiCuaViec(v('08:00:00', '08:30:00'))).toBe('SANG');
    expect(buoiCuaViec(v('11:30:00', '12:00:00'))).toBe('SANG');
    expect(buoiCuaViec(v('13:30:00', '14:20:00'))).toBe('CHIEU');
    expect(buoiCuaViec(v('17:45:00', '18:00:00'))).toBe('CHIEU');
    expect(buoiCuaViec(v('18:00:00', '19:30:00'))).toBe('NGOAI_GIO');
  });
});

describe('thời lượng khuyến nghị đọc thành lời', () => {
  it('dưới một giờ đọc theo phút, tròn giờ không kèm «0 phút»', () => {
    expect(moTaThoiLuong(40)).toBe('40 phút');
    expect(moTaThoiLuong(60)).toBe('1 giờ');
    expect(moTaThoiLuong(90)).toBe('1 giờ 30 phút');
    expect(moTaThoiLuong(210)).toBe('3 giờ 30 phút');
  });
  it('không có thời lượng thì không in gì', () => {
    expect(moTaThoiLuong(0)).toBe('');
    expect(moTaThoiLuong(-5)).toBe('');
  });
});

describe('gom lịch một ngày thành các buổi', () => {
  const ngay = [
    v('13:30:00', '14:20:00', 6, 'chiều 1'),
    v('08:00:00', '08:30:00', 1, 'sáng 1'),
    v('18:00:00', '19:30:00', 12, 'pickleball'),
    v('10:40:00', '11:30:00', 5, 'sáng cuối'),
  ];
  it('đúng thứ tự sáng → chiều → sau giờ làm việc, trong buổi xếp theo giờ', () => {
    const ds = nhomTheoBuoi(ngay);
    expect(ds.map((n) => n.buoi)).toEqual(['SANG', 'CHIEU', 'NGOAI_GIO']);
    expect(ds[0].viec.map((x) => x.ten)).toEqual(['sáng 1', 'sáng cuối']);
  });
  it('khung giờ khuyến nghị của buổi là từ sớm nhất tới muộn nhất, dạng HH:MM', () => {
    const [sang, chieu] = nhomTheoBuoi(ngay);
    expect([sang.tu, sang.den]).toEqual(['08:00', '11:30']);
    expect([chieu.tu, chieu.den]).toEqual(['13:30', '14:20']);
  });
  it('tổng thời lượng khuyến nghị cộng đúng theo buổi', () => {
    expect(nhomTheoBuoi(ngay)[0].tongPhut).toBe(30 + 50);
  });
  it('buổi rỗng không xuất hiện — pickleball chỉ có ở bốn ngày', () => {
    const ds = nhomTheoBuoi([v('08:00:00', '08:30:00')]);
    expect(ds.map((n) => n.buoi)).toEqual(['SANG']);
    expect(nhomTheoBuoi([])).toEqual([]);
  });
  it('giờ kết thúc muộn nhất chứ không phải của đầu việc cuối danh sách', () => {
    const [sang] = nhomTheoBuoi([v('09:00:00', '11:00:00', 1), v('09:30:00', '10:00:00', 2)]);
    expect(sang.den).toBe('11:00');
  });
  it('mỗi buổi trong TTC_BUOI có tên tiếng Việt để giao diện không tự đặt', () => {
    expect(TTC_BUOI.map((b) => b.ten)).toEqual(['Buổi sáng', 'Buổi chiều', 'Sau giờ làm việc']);
  });
});
