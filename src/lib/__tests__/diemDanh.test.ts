import { describe, it, expect } from 'vitest';
import {
  CHAM_NGON_EQ, TTC_TEN_LUONG, chamNgonCuaNgay, chuKhoangCach, docCauHinhDiemDanh, duoiMa, duongDanQuet,
  khoangCachM, laNgayHocHomNay, nhanDiemDanh, tenFileQr, tomTatDiemDanh, type TtcDiemDanh,
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
  it('rỗng thì tắt, muộn sau 15 phút, mở cả hai luồng', () => {
    expect(docCauHinhDiemDanh({})).toEqual({ bat: false, muon_phut: 15, luong: ['DINH_VI', 'QR'] });
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
