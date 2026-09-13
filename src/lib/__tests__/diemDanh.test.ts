import { describe, it, expect } from 'vitest';
import {
  CHAM_NGON_EQ, TTC_TEN_LUONG, chamNgonCuaNgay, chuKhoangCach, docCauHinhDiemDanh, duoiMa, duongDanQuet,
  khoangCachM, laNgayHocHomNay, nhanDiemDanh, tenFileQr, tomTatDiemDanh,
  SO_LAN_THU_TOI_THIEU, TTC_BAN_KINH_MAX, TTC_BAN_KINH_MIN, ketLuanThuDinhVi, nhanLuong,
  type TtcDiemDanh, type TtcThuDinhVi,
} from '../diemDanh';

const dd = (them: Partial<TtcDiemDanh> = {}): TtcDiemDanh => ({
  id: 'd1', ngay_id: 'n1', nguoi: 'p1', luc: '2026-09-08T00:52:00Z', luong: 'DINH_VI',
  vi_do: 20.92, kinh_do: 106.07, do_chinh_xac_m: 18, khoang_cach_m: 35, muon_phut: 0,
  qr_ngay_id: null, nguoi_ghi_ho: null, ghi_chu: null, ...them,
});

describe('khoảng cách tới phòng học', () => {
  it('cùng một điểm là 0; 0,001 độ vĩ ≈ 111 m; sai số dưới 1%', () => {
    expect(khoangCachM(20.92, 106.07, 20.92, 106.07)).toBe(0);
    expect(khoangCachM(20.92, 106.07, 20.921, 106.07)).toBeCloseTo(111, 0);
    // Đối chiếu với hàm ttc_khoang_cach_m của máy chủ: 20.9200/106.0700 → 20.9500/106.0700 = 3336 m
    expect(Math.round(khoangCachM(20.92, 106.07, 20.95, 106.07))).toBe(3336);
  });
  it('chữ khoảng cách đọc theo mét dưới 1 km, theo ki-lô-mét từ 1 km', () => {
    expect(chuKhoangCach(35.4)).toBe('35 m');
    expect(chuKhoangCach(999)).toBe('999 m');
    expect(chuKhoangCach(3336)).toBe('3.3 km');
    expect(chuKhoangCach(null)).toBe('—');
  });
});

describe('cấu hình điểm danh của một lần đào tạo', () => {
  it('rỗng thì tắt và CHỈ QR — luồng định vị phải thẩm định mới mở', () => {
    expect(docCauHinhDiemDanh({})).toEqual({ bat: false, muon_phut: 15, luong: ['QR'] });
  });
  it('bỏ giá trị lạ: phút ngoài 0–120 về mặc định, luồng lạ bị loại, không nhân đôi', () => {
    expect(docCauHinhDiemDanh({ bat: true, muon_phut: 999, luong: ['QR', 'QR', 'BAY'] }))
      .toEqual({ bat: true, muon_phut: 15, luong: ['QR'] });
    expect(docCauHinhDiemDanh({ bat: 'true', muon_phut: 0, luong: [] }))
      .toEqual({ bat: false, muon_phut: 0, luong: [] });
  });
});

describe('nhãn và tổng hợp', () => {
  it('chưa điểm danh · đúng giờ · muộn, có nói rõ đi bằng luồng nào', () => {
    expect(nhanDiemDanh(null)).toEqual({ chu: 'Chưa điểm danh', muc: 'CHUA' });
    expect(nhanDiemDanh(dd()).muc).toBe('XONG');
    expect(nhanDiemDanh(dd()).chu).toContain('đúng giờ · định vị');
    const muon = nhanDiemDanh(dd({ muon_phut: 12, luong: 'QR' }));
    expect(muon.muc).toBe('MUON');
    expect(muon.chu).toContain('muộn 12 phút · quét qr');
    expect(nhanDiemDanh(dd({ luong: 'BO_SUNG' })).chu).toContain('ghi hộ');
    expect(TTC_TEN_LUONG.BO_SUNG).toBe('Ghi hộ');
  });
  it('tổng hợp cả lớp: có mặt, muộn, vắng', () => {
    expect(tomTatDiemDanh(3, [dd(), dd({ id: 'd2', muon_phut: 5 })]))
      .toEqual({ tong: 3, coMat: 2, muon: 1, vang: 1 });
    expect(tomTatDiemDanh(1, [dd(), dd({ id: 'd2' })]).vang).toBe(0);
  });
});

describe('tấm QR in ra', () => {
  it('mỗi ngày một châm ngôn, quay vòng khi vượt số câu, không vỡ với số lạ', () => {
    expect(chamNgonCuaNgay(1)).toBe(CHAM_NGON_EQ[0]);
    expect(chamNgonCuaNgay(10)).toBe(CHAM_NGON_EQ[9]);
    expect(chamNgonCuaNgay(11)).toBe(CHAM_NGON_EQ[0]);
    expect(chamNgonCuaNgay(0)).toBe(CHAM_NGON_EQ[9]);
    expect(new Set(CHAM_NGON_EQ).size).toBe(CHAM_NGON_EQ.length);
  });
  it('đường dẫn quét lấy theo tên miền đang mở, mã được thoát đúng', () => {
    expect(duongDanQuet('https://bachungyenone.vn', 'aB-c_1'))
      .toBe('https://bachungyenone.vn/one/training-center/diem-danh?ma=aB-c_1');
    expect(duongDanQuet('https://bachungyenone.vn/', 'a+b/c')).toContain('ma=a%2Bb%2Fc');
  });
  it('tên tệp mang số ngày, ngày tháng và tên chương trình bỏ dấu', () => {
    expect(tenFileQr(2, '2026-09-08', 'Chương trình 10 ngày Trưởng phòng KHDN — Bản 4.0'))
      .toBe('QR_NGAY02_08-09-2026_ChuongTrinh10NgayTruongPhong.png');
    expect(tenFileQr(10, '2026-09-18', '')).toBe('QR_NGAY10_18-09-2026.png');
    expect(duoiMa('abcd1234efgh5678')).toBe('5678');
  });
  it('chỉ hiện thẻ điểm danh đúng ngày học', () => {
    expect(laNgayHocHomNay('2026-09-08', '2026-09-08')).toBe(true);
    expect(laNgayHocHomNay('2026-09-09', '2026-09-08')).toBe(false);
  });
});

describe('thẩm định định vị trước khi mở luồng', () => {
  const thu = (id: string, luc: string, cach: number, saiSo: number | null = 20): TtcThuDinhVi => ({
    id, chuong_trinh_id: 'ct', nguoi: 'p1', luc, vi_do: 20.92, kinh_do: 106.07,
    do_chinh_xac_m: saiSo, khoang_cach_m: cach, vi_tri: 'giữa phòng',
  });

  it('chưa thử lần nào: chưa đạt, có câu chỉ việc phải làm', () => {
    const k = ketLuanThuDinhVi([], 150);
    expect(k.datChuan).toBe(false);
    expect(k.banKinhDeXuat).toBeNull();
    expect(k.cau).toContain('Chưa thử lần nào');
  });

  it(`đủ ${SO_LAN_THU_TOI_THIEU} lần và đều trong bán kính thì đạt`, () => {
    const k = ketLuanThuDinhVi([
      thu('a', '2026-09-06T01:00:00Z', 35),
      thu('b', '2026-09-06T01:05:00Z', 48),
      thu('c', '2026-09-06T01:10:00Z', 59),
    ], 150);
    expect(k.datChuan).toBe(true);
    expect(k.soLan).toBe(3);
    expect(k.xaNhat).toBe(59);
    expect(k.cau).toContain('Đã đạt');
  });

  it('hai lần thì chưa đủ; một lần vượt bán kính thì trượt dù đủ số lần', () => {
    expect(ketLuanThuDinhVi([thu('a', '2026-09-06T01:00:00Z', 35), thu('b', '2026-09-06T01:05:00Z', 40)], 150).cau)
      .toContain('Còn thiếu 1 lần');
    const truot = ketLuanThuDinhVi([
      thu('a', '2026-09-06T01:00:00Z', 35),
      thu('b', '2026-09-06T01:05:00Z', 40),
      thu('c', '2026-09-06T01:10:00Z', 400),
    ], 150);
    expect(truot.datChuan).toBe(false);
    expect(truot.cau).toContain('vượt bán kính 150 m');
  });

  it('chỉ xét ba lần GẦN NHẤT — lần đo cũ ở phòng khác không cứu được đợt mới', () => {
    const k = ketLuanThuDinhVi([
      thu('cu1', '2026-09-01T01:00:00Z', 10), thu('cu2', '2026-09-01T01:01:00Z', 12),
      thu('moi1', '2026-09-06T01:00:00Z', 30), thu('moi2', '2026-09-06T01:05:00Z', 40),
      thu('moi3', '2026-09-06T01:10:00Z', 900),
    ], 150);
    expect(k.baGanNhat.map((t) => t.id)).toEqual(['moi3', 'moi2', 'moi1']);
    expect(k.datChuan).toBe(false);
  });

  it('bán kính đề xuất = chỗ xa nhất cộng sai số, làm tròn lên bội 50, kẹp trong 50–2000', () => {
    // 59 + 30 = 89 → 100
    expect(ketLuanThuDinhVi([thu('a', '2026-09-06T01:00:00Z', 59, 30)], 150).banKinhDeXuat).toBe(100);
    // 12 + 5 = 17 → dưới sàn 50
    expect(ketLuanThuDinhVi([thu('a', '2026-09-06T01:00:00Z', 12, 5)], 150).banKinhDeXuat).toBe(TTC_BAN_KINH_MIN);
    // vượt trần thì kẹp lại
    expect(ketLuanThuDinhVi([thu('a', '2026-09-06T01:00:00Z', 9000, 50)], 150).banKinhDeXuat).toBe(TTC_BAN_KINH_MAX);
    // thiếu sai số thì coi như 0
    expect(ketLuanThuDinhVi([thu('a', '2026-09-06T01:00:00Z', 120, null)], 150).banKinhDeXuat).toBe(150);
  });

  it('nhãn luồng đọc được trong danh sách chương trình', () => {
    expect(nhanLuong(docCauHinhDiemDanh({}))).toBe('Chưa bật điểm danh');
    expect(nhanLuong(docCauHinhDiemDanh({ bat: true, luong: ['QR'] }))).toBe('QR');
    expect(nhanLuong(docCauHinhDiemDanh({ bat: true, luong: ['DINH_VI', 'QR'] }))).toBe('Định vị + QR');
    expect(nhanLuong(docCauHinhDiemDanh({ bat: true, luong: [] }))).toBe('Bật nhưng chưa chọn luồng');
  });
});
