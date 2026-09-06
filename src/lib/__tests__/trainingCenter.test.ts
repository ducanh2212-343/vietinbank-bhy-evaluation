import { describe, it, expect } from 'vitest';
import {
  TTC_THANG_BLOOM, TTC_TIEU_CHI_TU_SOI, TTC_TEN, TTC_TEN_NGAN,
  tongDiemBloom, thangCanCungCo, diemBloomHopLe,
  trangThaiViec, tichDuoc, ngayMacDinh, tienDoNgay,
  lichBgd, vuotTranBgd, tongGioCaDot, thoiLuongPhut,
  cotBangViec, chiaCotBangViec, huyHieuGoiDau, goiDauDuTruong,
  tenFileSanPham, laTinTrainingCenter, nhanNgay,
  type TtcNgay, type TtcDauViec,
} from '../trainingCenter';
import type { Ct2DauViec } from '../ct2';

const ngay = (so: number, d: string): TtcNgay => ({
  id: `n${so}`, chuong_trinh_id: 'ct', so_thu_tu: so, ngay: d, tieu_de: `Ngày ${so}`,
  khoi: null, van_ban: null, nhiem_vu_van_ban: null, chuan_bi: null, lat_cat: null, cau_hoi_tu_soi: null,
});

const viec = (ngayId: string, bd: string, kt: string, ai: TtcDauViec['nguoi_phu_trach'], id = `${ngayId}-${bd}`): TtcDauViec => ({
  id, ngay_id: ngayId, phan: 'TRINH_BAY', thu_tu: 1, gio_bat_dau: bd, gio_ket_thuc: kt,
  ten: 'x', dau_ra: null, nguoi_phu_trach: ai, thiet_bi: 'KHONG', noi_nop: 'KHONG', trong_tam: false,
});

describe('tên gọi và dữ liệu nền', () => {
  it('viết đúng chính tả Training Center, không rút thành BHY TC', () => {
    expect(TTC_TEN).toBe('Bắc Hưng Yên Training Center');
    expect(TTC_TEN_NGAN).toBe('BHY Training Center');
    expect(TTC_TEN).not.toMatch(/Tranning/);
  });

  it('barem Bloom đúng 100 điểm, 8 tiêu chí tự soi đủ ba mức', () => {
    expect(TTC_THANG_BLOOM.reduce((s, t) => s + t.toiDa, 0)).toBe(100);
    expect(TTC_TIEU_CHI_TU_SOI).toHaveLength(8);
    for (const tc of TTC_TIEU_CHI_TU_SOI) {
      expect(tc.muc1.length).toBeGreaterThan(0);
      expect(tc.muc3.length).toBeGreaterThan(0);
      expect(tc.muc5.length).toBeGreaterThan(0);
    }
  });
});

describe('phiếu chấm Bloom', () => {
  const day = { b1: 10, b2: 15, b3: 20, b4: 20, b5: 20, b6: 15, tru_hinh_thuc: 0 };

  it('tổng = cộng sáu thang trừ hình thức, kẹp trong 0..100', () => {
    expect(tongDiemBloom(day)).toBe(100);
    expect(tongDiemBloom({ ...day, tru_hinh_thuc: 5 })).toBe(95);
    expect(tongDiemBloom({ b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, tru_hinh_thuc: 5 })).toBe(0);
  });

  it('thang dưới 60% điểm tối đa là cấu phần cần củng cố (mốc thông báo 4)', () => {
    // 11/20 = 55% → cần củng cố; 12/20 = 60% → không
    expect(thangCanCungCo({ ...day, b3: 11 }).map((t) => t.ma)).toEqual(['b3']);
    expect(thangCanCungCo({ ...day, b3: 12 })).toEqual([]);
    expect(thangCanCungCo({ ...day, b1: 5, b6: 8 }).map((t) => t.ma)).toEqual(['b1', 'b6']);
  });

  it('chặn điểm vượt khung hoặc trừ hình thức quá 5', () => {
    expect(diemBloomHopLe(day)).toBe(true);
    expect(diemBloomHopLe({ ...day, b1: 11 })).toBe(false);
    expect(diemBloomHopLe({ ...day, tru_hinh_thuc: 6 })).toBe(false);
    expect(diemBloomHopLe({ ...day, b4: 2.5 })).toBe(false);
  });
});

describe('trạng thái đầu việc theo ngày', () => {
  const homNay = '2026-09-09';
  it('ngày chưa tới → chưa mở, không tích được', () => {
    expect(trangThaiViec({ ngay: '2026-09-10' }, null, false, homNay)).toBe('CHUA_MO');
    expect(tichDuoc({ ngay: '2026-09-10' }, homNay)).toBe(false);
  });
  it('đã tới ngày mà chưa tích → đang làm; tích rồi → hoàn thành; có phiếu chấm → đã đánh giá', () => {
    expect(trangThaiViec({ ngay: '2026-09-09' }, null, false, homNay)).toBe('DANG_LAM');
    expect(trangThaiViec({ ngay: '2026-09-08' }, { hoan_thanh: false }, false, homNay)).toBe('DANG_LAM');
    expect(trangThaiViec({ ngay: '2026-09-09' }, { hoan_thanh: true }, false, homNay)).toBe('HOAN_THANH');
    expect(trangThaiViec({ ngay: '2026-09-08' }, { hoan_thanh: true }, true, homNay)).toBe('DA_DANH_GIA');
    expect(tichDuoc({ ngay: '2026-09-08' }, homNay)).toBe(true);
  });

  it('ngày mặc định: hôm nay nếu trong đợt, ngày kế tiếp nếu rơi vào cuối tuần, ngày cuối khi đã qua', () => {
    const ds = [ngay(2, '2026-09-08'), ngay(1, '2026-09-07'), ngay(3, '2026-09-14')];
    expect(ngayMacDinh(ds, '2026-09-08')!.so_thu_tu).toBe(2);
    expect(ngayMacDinh(ds, '2026-09-12')!.so_thu_tu).toBe(3); // thứ Bảy giữa đợt → chuẩn bị ngày kế
    expect(ngayMacDinh(ds, '2026-09-01')!.so_thu_tu).toBe(1);
    expect(ngayMacDinh(ds, '2026-09-30')!.so_thu_tu).toBe(3);
    expect(ngayMacDinh([], '2026-09-08')).toBeNull();
  });

  it('tiến độ ngày: đủ khi mọi đầu việc được tích', () => {
    const ds = [{ id: 'a' }, { id: 'b' }];
    expect(tienDoNgay(ds, [{ dau_viec_id: 'a', hoan_thanh: true }])).toEqual({ tong: 2, xong: 1, du: false });
    expect(tienDoNgay(ds, [{ dau_viec_id: 'a', hoan_thanh: true }, { dau_viec_id: 'b', hoan_thanh: true }]).du).toBe(true);
    // thẻ tích rồi bỏ tích không tính
    expect(tienDoNgay(ds, [{ dau_viec_id: 'a', hoan_thanh: false }]).xong).toBe(0);
    expect(tienDoNgay([], []).du).toBe(false);
  });
});

describe('lịch Ban Giám đốc', () => {
  const dsNgay = [ngay(1, '2026-09-07'), ngay(2, '2026-09-08'), ngay(3, '2026-09-09')];
  const dsViec = [
    viec('n1', '08:00', '08:20', 'GD'),
    viec('n1', '09:00', '10:00', 'GD'),
    viec('n1', '10:45', '11:30', 'GD_PGD'),
    viec('n2', '15:30', '16:00', 'GD_PGD'),
    viec('n2', '16:00', '16:30', 'GD_PGD'),
    viec('n2', '07:30', '07:50', 'TCTH'),       // không cần BGĐ
    viec('n3', '15:30', '16:00', 'PGD'),
    viec('n3', '16:00', '16:40', 'PGD'),
  ];

  it('chỉ gom khung giờ cần GĐ/PGĐ, xếp theo giờ, tính phút từng người', () => {
    const lich = lichBgd(dsNgay, dsViec);
    expect(lich.map((d) => d.viec.length)).toEqual([3, 2, 2]);
    expect(lich[0].viec.map((v) => v.gio_bat_dau)).toEqual(['08:00', '09:00', '10:45']);
    expect(lich[0].phutGd).toBe(20 + 60 + 45);
    expect(lich[0].phutPgd).toBe(45);
    expect(lich[1].phutGd).toBe(60);
    expect(lich[1].phutPgd).toBe(60);
    expect(lich[2].phutGd).toBe(0);
    expect(lich[2].phutPgd).toBe(70);
  });

  it('trần 60 phút/người/ngày, miễn ngày đầu và ngày cuối', () => {
    const lich = lichBgd(dsNgay, dsViec);
    expect(vuotTranBgd(lich[0], 3)).toBe(false); // ngày 1 miễn dù 125 phút
    expect(vuotTranBgd(lich[1], 3)).toBe(false); // đúng 60
    expect(vuotTranBgd(lich[2], 3)).toBe(false); // ngày cuối miễn
    expect(vuotTranBgd(lich[2], 10)).toBe(true);  // không phải ngày cuối → 70 > 60
  });

  it('tổng giờ cả đợt làm tròn một chữ số', () => {
    expect(tongGioCaDot(lichBgd(dsNgay, dsViec))).toEqual({ gioGd: 3.1, gioPgd: 2.9 });
    expect(thoiLuongPhut({ gio_bat_dau: 'xx', gio_ket_thuc: '09:00' })).toBe(540);
    expect(thoiLuongPhut({ gio_bat_dau: '10:00', gio_ket_thuc: '09:00' })).toBe(0);
  });
});

describe('bảng việc — ba cột dùng chung với Chiêu thức 2', () => {
  it('bảy trạng thái gấp về ba cột theo đúng luật cotHienThi; dừng/hủy không lên bảng', () => {
    expect(cotBangViec('CHUAN_BI')).toBe('PHAI_LAM');
    expect(cotBangViec('DANG_LAM')).toBe('DANG_LAM');
    expect(cotBangViec('CHO_PHOI_HOP')).toBe('DANG_LAM');
    expect(cotBangViec('CHO_DUYET')).toBe('DANG_LAM');
    expect(cotBangViec('HOAN_THANH')).toBe('HOAN_THANH');
    expect(cotBangViec('DA_DONG')).toBe('HOAN_THANH');
    expect(cotBangViec('DUNG_HUY')).toBeNull();
  });

  it('chia cột giữ đủ thẻ, thẻ dừng/hủy rơi ra ngoài', () => {
    const the = (id: string, tt: Ct2DauViec['trang_thai']) => ({ id, trang_thai: tt } as Ct2DauViec);
    const m = chiaCotBangViec([the('a', 'CHUAN_BI'), the('b', 'CHO_DUYET'), the('c', 'DA_DONG'), the('d', 'DUNG_HUY')]);
    expect(m.get('PHAI_LAM')!.map((t) => t.id)).toEqual(['a']);
    expect(m.get('DANG_LAM')!.map((t) => t.id)).toEqual(['b']);
    expect(m.get('HOAN_THANH')!.map((t) => t.id)).toEqual(['c']);
  });

  it('huy hiệu gối đầu chỉ gắn cho thẻ đã liên kết; ô nghiệm thu mở khi đủ 5W2H', () => {
    const m = huyHieuGoiDau([{ so: 1, dau_viec_id: 'x' }, { so: 2, dau_viec_id: null }, { so: 3, dau_viec_id: 'z' }]);
    expect([...m.entries()]).toEqual([['x', 1], ['z', 3]]);
    const du = { ten: 'Tổng hợp KCN', muc_dich: 'a', dau_ra: 'b', can_bo: 'p1', tieu_chuan: 'c', han: '2026-09-20', moc_kiem_tra: '2026-09-15' };
    expect(goiDauDuTruong(du)).toBe(true);
    expect(goiDauDuTruong({ ...du, can_bo: null })).toBe(false);
    expect(goiDauDuTruong({ ...du, tieu_chuan: '  ' })).toBe(false);
  });
});

describe('tiện ích', () => {
  it('đặt tên file sản phẩm đúng quy tắc NGAY[số]_[MÃ]_[HọTênLiền].[đuôi]', () => {
    expect(tenFileSanPham(2, 'PHIEUVANBAN', 'Đỗ Việt Anh', 'docx')).toBe('NGAY02_PHIEUVANBAN_DoVietAnh.docx');
    expect(tenFileSanPham(10, 'slide 6', 'Nguyễn Đức Thái Hoàng', '.pptx')).toBe('NGAY10_SLIDE6_NguyenDucThaiHoang.pptx');
  });

  it('nhận diện tin Training Center theo tiền tố mã sự kiện', () => {
    expect(laTinTrainingCenter('TTC_DU_NGAY')).toBe(true);
    expect(laTinTrainingCenter('N12')).toBe(false);
  });

  it('nhãn ngày theo thứ tiếng Việt, không lệch múi giờ', () => {
    expect(nhanNgay('2026-09-07')).toBe('Thứ Hai 07/09');
    expect(nhanNgay('2026-09-18')).toBe('Thứ Sáu 18/09');
    expect(nhanNgay('hỏng')).toBe('hỏng');
  });
});
