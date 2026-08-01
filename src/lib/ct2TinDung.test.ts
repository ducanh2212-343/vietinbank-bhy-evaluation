import { describe, expect, it } from 'vitest';
import {
  buocKeTiep,
  canhBaoHoSo,
  dinhDangTien,
  docSoTien,
  hsConLaiDenHan,
  hsNghenCho,
  hsQuaHan,
  hsTuoiCho,
  kiemTraHoSo,
  lyDoChanChuyenHoSo,
  sapXepHoSo,
  tongTheoBuoc,
  type HoSoTinDung,
  type HsFormTao,
} from './ct2TinDung';

const formDu: HsFormTao = {
  khach_hang: 'Công ty CP Tập đoàn Thaicom',
  loai_ho_so: 'TAI_CAP',
  so_tien: '160000',
  ky_han: 'NGAN_HAN',
  cap_phe_duyet: 'TSC',
  can_bo: 'p1',
  han_xu_ly: '2026-08-31',
  ngay_den_han_ghtd: '2026-07-31',
};

const hsGoc: HoSoTinDung = {
  id: 'h1', phong: 'd1', ma_hs: 'KHDN-TD-2608-001',
  khach_hang: 'Công ty CP Tập đoàn Thaicom', loai_ho_so: 'TAI_CAP',
  so_tien: 160_000, ky_han: 'NGAN_HAN', cap_phe_duyet: 'TSC',
  trang_thai: 'TRINH_LDCN', can_bo: 'p1', lanh_dao_theo_doi: 'p2',
  ngay_nhan: '2026-08-01', han_xu_ly: '2026-08-20', ngay_den_han_ghtd: '2026-09-30',
  ngay_hoan_thanh: null, nguoi_dang_giu: 'p3', giu_tu: '2026-08-05T02:00:00Z',
  nhip_gan_nhat: null, ly_do_tu_choi: null, ghi_chu: null, nguoi_tao: 'p2',
  created_at: '2026-08-01T01:00:00Z', updated_at: '2026-08-05T02:00:00Z',
};

// 09:00 giờ VN ngày 12/08/2026
const moc = new Date('2026-08-12T02:00:00Z');

describe('Cổng nhập hồ sơ tín dụng', () => {
  it('đủ trường thì tạo được', () => {
    expect(kiemTraHoSo(formDu)).toEqual([]);
  });

  it('số tiền phải là SỐ — không nhận "160 tỷ" kiểu nhãn chữ trên Miro', () => {
    expect(kiemTraHoSo({ ...formDu, so_tien: '160 tỷ' }).some((t) => t.truong === 'so_tien')).toBe(true);
    expect(kiemTraHoSo({ ...formDu, so_tien: '' }).some((t) => t.truong === 'so_tien')).toBe(true);
    expect(kiemTraHoSo({ ...formDu, so_tien: '0' }).some((t) => t.truong === 'so_tien')).toBe(true);
  });

  it('đọc được số tiền người dùng gõ theo thói quen', () => {
    expect(docSoTien('160000')).toBe(160_000);
    expect(docSoTien('160.000')).toBe(160_000);   // dấu chấm ngăn nghìn
    expect(docSoTien('150,5')).toBe(150.5);       // dấu phẩy thập phân
    expect(docSoTien('30  ')).toBe(30);
    expect(docSoTien('150 ty')).toBeNull();
    expect(docSoTien('abc')).toBeNull();
  });

  it('hiện số tiền theo cách người ngân hàng đọc', () => {
    expect(dinhDangTien(160_000)).toBe('160 tỷ');
    expect(dinhDangTien(1500)).toBe('1.5 tỷ');
    expect(dinhDangTien(850)).toBe('850 triệu');
  });

  it('bắt buộc đúng 01 cán bộ và phải có hạn xử lý', () => {
    expect(kiemTraHoSo({ ...formDu, can_bo: '' }).some((t) => t.truong === 'can_bo')).toBe(true);
    expect(kiemTraHoSo({ ...formDu, han_xu_ly: '' }).some((t) => t.truong === 'han_xu_ly')).toBe(true);
  });
});

describe('Luật chuyển bước theo thẩm quyền', () => {
  const bc = { cap_phe_duyet: 'CHI_NHANH' as const, laLanhDao: false, coLyDoTuChoi: false };

  it('hồ sơ thẩm quyền Chi nhánh không được trình lên TSC', () => {
    expect(lyDoChanChuyenHoSo('TRINH_LDCN', 'TRINH_TSC', bc)).toContain('Trụ sở chính');
    expect(lyDoChanChuyenHoSo('TRINH_LDCN', 'TRINH_TSC', { ...bc, cap_phe_duyet: 'TSC' })).toBeNull();
  });

  it('không nhảy thẳng sang Hoàn thành mà chưa hoàn thiện hồ sơ giải ngân', () => {
    expect(lyDoChanChuyenHoSo('TRINH_LDCN', 'HOAN_THANH', bc)).toContain('giải ngân');
    expect(lyDoChanChuyenHoSo('HOAN_THIEN_GN', 'HOAN_THANH', bc)).toBeNull();
  });

  it('từ chối cần lãnh đạo và cần lý do', () => {
    expect(lyDoChanChuyenHoSo('THU_THAP', 'TU_CHOI', bc)).toContain('lãnh đạo');
    expect(lyDoChanChuyenHoSo('THU_THAP', 'TU_CHOI', { ...bc, laLanhDao: true })).toContain('lý do');
    expect(lyDoChanChuyenHoSo('THU_THAP', 'TU_CHOI', { ...bc, laLanhDao: true, coLyDoTuChoi: true })).toBeNull();
  });

  it('bước kế tiếp bỏ qua đúng cấp không cần trình', () => {
    expect(buocKeTiep('TRINH_LDP', 'PHONG')).toBe('HOAN_THIEN_GN');
    expect(buocKeTiep('TRINH_LDP', 'CHI_NHANH')).toBe('TRINH_LDCN');
    expect(buocKeTiep('TRINH_LDCN', 'CHI_NHANH')).toBe('HOAN_THIEN_GN');
    expect(buocKeTiep('TRINH_LDCN', 'TSC')).toBe('TRINH_TSC');
    expect(buocKeTiep('HOAN_THANH', 'TSC')).toBeNull();
  });
});

describe('Cảnh báo hồ sơ — bộ kiểm cho board có rủi ro tài chính', () => {
  it('tính đúng quá hạn xử lý và tuổi cột chờ', () => {
    expect(hsQuaHan(hsGoc, moc)).toBe(0);      // hạn 20/08, hôm nay 12/08 → chưa quá
    expect(hsQuaHan({ ...hsGoc, han_xu_ly: '2026-08-05' }, moc)).toBe(7);
    expect(hsTuoiCho(hsGoc, moc)).toBe(7);
    expect(hsNghenCho(hsGoc, moc)).toBe(true); // ngưỡng TRINH_LDCN là 3 ngày
  });

  it('hồ sơ đã xong không còn tính quá hạn', () => {
    expect(hsQuaHan({ ...hsGoc, trang_thai: 'HOAN_THANH' }, moc)).toBe(0);
  });

  it('ngưỡng chờ khác nhau theo cấp trình', () => {
    const tsc = { ...hsGoc, trang_thai: 'TRINH_TSC' as const, giu_tu: '2026-08-08T02:00:00Z' };
    expect(hsTuoiCho(tsc, moc)).toBe(4);
    expect(hsNghenCho(tsc, moc)).toBe(false);  // TSC cho 5 ngày
    const ldp = { ...hsGoc, trang_thai: 'TRINH_LDP' as const, giu_tu: '2026-08-08T02:00:00Z' };
    expect(hsNghenCho(ldp, moc)).toBe(true);   // Lãnh đạo Phòng chỉ 2 ngày
  });

  it('hạn mức sắp hết là cảnh báo nặng nhất, đứng trước quá hạn xử lý', () => {
    const h = { ...hsGoc, ngay_den_han_ghtd: '2026-09-05', han_xu_ly: '2026-08-01' };
    const cb = canhBaoHoSo(h, moc);
    expect(cb[0].noi_dung).toContain('Hạn mức còn 24 ngày');
    expect(cb[0].muc).toBe('DO');
    expect(cb.some((c) => c.noi_dung.includes('Quá hạn xử lý'))).toBe(true);
  });

  it('hạn mức đã hết mà hồ sơ chưa xong là cảnh báo đỏ', () => {
    const cb = canhBaoHoSo({ ...hsGoc, ngay_den_han_ghtd: '2026-08-01' }, moc);
    expect(cb[0].noi_dung).toContain('Hạn mức đã hết 11 ngày');
  });

  it('hồ sơ tái cấp thiếu ngày hạn mức bị nhắc — đúng lỗi đang có trên Miro', () => {
    const cb = canhBaoHoSo({ ...hsGoc, ngay_den_han_ghtd: null, giu_tu: null, han_xu_ly: '2026-08-31' }, moc);
    expect(cb.some((c) => c.noi_dung.includes('chưa ghi ngày hạn mức'))).toBe(true);
  });

  it('hồ sơ cấp mới không bị đòi ngày hạn mức', () => {
    const cb = canhBaoHoSo({
      ...hsGoc, loai_ho_so: 'CAP_MOI', ngay_den_han_ghtd: null, giu_tu: null, han_xu_ly: '2026-08-31',
    }, moc);
    expect(cb).toEqual([]);
  });

  it('tính đúng số ngày còn lại tới hạn mức', () => {
    expect(hsConLaiDenHan(hsGoc, moc)).toBe(49);
    expect(hsConLaiDenHan({ ngay_den_han_ghtd: null }, moc)).toBeNull();
  });
});

describe('Số liệu điều hành — chỉ tính được vì số tiền là SỐ', () => {
  const ds: HoSoTinDung[] = [
    hsGoc,
    { ...hsGoc, id: 'h2', so_tien: 30_000, trang_thai: 'TRINH_LDCN' },
    { ...hsGoc, id: 'h3', so_tien: 50_000, trang_thai: 'THU_THAP', giu_tu: null, ngay_den_han_ghtd: null, loai_ho_so: 'CAP_MOI' },
  ];

  it('cộng được tổng dư nợ đang trình theo từng bước', () => {
    const m = tongTheoBuoc(ds);
    expect(m.get('TRINH_LDCN')).toEqual({ so: 2, tien: 190_000 });
    expect(m.get('THU_THAP')).toEqual({ so: 1, tien: 50_000 });
  });

  it('xếp hồ sơ rủi ro lên trước, cùng mức thì hồ sơ to hơn trước', () => {
    const xep = sapXepHoSo(ds, moc);
    expect(xep[0].id).toBe('h1');   // 160 tỷ, nghẽn chờ 7 ngày
    expect(xep[1].id).toBe('h2');   // 30 tỷ, cũng nghẽn nhưng nhỏ hơn
    expect(xep[2].id).toBe('h3');   // sạch cảnh báo
  });
});
