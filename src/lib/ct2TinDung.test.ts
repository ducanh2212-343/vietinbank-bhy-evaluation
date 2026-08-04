import { describe, expect, it } from 'vitest';
import {
  hsChuaGhiLanNao,
  hsMucImLang,
  hsNgayImLang,
  buocKeTiep,
  canhBaoHoSo,
  dinhDangTien,
  docSoTien,
  hsConLaiDenHan,
  hsNghenCho,
  hsQuaHan,
  hsSuaDuocSoTien,
  hsThuocDaiDenHan,
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
  trang_thai: 'TRINH_LDCN', can_bo: 'p1', lanh_dao_theo_doi: 'p2', pho_phong: null, truong_phong: null, pgd_phu_trach: null,
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
    // Giữ từ 05/08 (thứ 4) → 12/08 (thứ 4): 7 ngày lịch nhưng 5 NGÀY LÀM VIỆC
    expect(hsTuoiCho(hsGoc, moc)).toBe(5);
    expect(hsNghenCho(hsGoc, moc)).toBe(true); // ngưỡng TRINH_LDCN là 3 ngày làm việc
  });

  it('hồ sơ đã xong không còn tính quá hạn', () => {
    expect(hsQuaHan({ ...hsGoc, trang_thai: 'HOAN_THANH' }, moc)).toBe(0);
  });

  it('ngưỡng chờ khác nhau theo cấp trình', () => {
    // 08/08 là thứ Bảy — hồ sơ trình cuối tuần chỉ bắt đầu đếm từ thứ Hai 10/08,
    // nên tới thứ Tư 12/08 mới là 3 ngày làm việc chứ không phải 4 ngày lịch
    const tsc = { ...hsGoc, trang_thai: 'TRINH_TSC' as const, giu_tu: '2026-08-08T02:00:00Z' };
    expect(hsTuoiCho(tsc, moc)).toBe(3);
    expect(hsNghenCho(tsc, moc)).toBe(false);  // TSC cho 5 ngày làm việc
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
      ...hsGoc, loai_ho_so: 'CAP_MOI', ngay_den_han_ghtd: null, giu_tu: null,
      han_xu_ly: '2026-08-31', nhip_gan_nhat: '2026-08-11T02:00:00Z',
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
    // Sạch cảnh báo: cấp mới nên không đòi ngày hạn mức, và vừa ghi nhịp hôm qua
    // nên không bị đánh dấu «chưa cập nhật»
    { ...hsGoc, id: 'h3', so_tien: 50_000, trang_thai: 'THU_THAP', giu_tu: null,
      ngay_den_han_ghtd: null, loai_ho_so: 'CAP_MOI', nhip_gan_nhat: '2026-08-11T02:00:00Z' },
  ];

  it('cộng được tổng dư nợ đang trình theo từng bước', () => {
    const m = tongTheoBuoc(ds);
    expect(m.get('TRINH_LDCN')).toEqual({ so: 2, tien: 190_000, thieu: 0 });
    expect(m.get('THU_THAP')).toEqual({ so: 1, tien: 50_000, thieu: 0 });
  });

  it('đếm riêng hồ sơ chưa có số tiền, không cộng chúng như 0', () => {
    // Hồ sơ nhập từ Miro không có số tiền: tổng KHÔNG đổi, nhưng phải biết là
    // tổng đang thiếu — nếu không thì «190 tỷ» đọc như đã gồm đủ.
    const m = tongTheoBuoc([...ds, { ...hsGoc, id: 'h4', so_tien: null, trang_thai: 'TRINH_LDCN' }]);
    expect(m.get('TRINH_LDCN')).toEqual({ so: 3, tien: 190_000, thieu: 1 });
  });

  it('xếp hồ sơ rủi ro lên trước, cùng mức thì hồ sơ to hơn trước', () => {
    const xep = sapXepHoSo(ds, moc);
    expect(xep[0].id).toBe('h1');   // 160 tỷ, nghẽn chờ 7 ngày
    expect(xep[1].id).toBe('h2');   // 30 tỷ, cũng nghẽn nhưng nhỏ hơn
    expect(xep[2].id).toBe('h3');   // sạch cảnh báo
  });
});

describe('Hồ sơ nhập từ dữ liệu lịch sử — ô trống phải nói ra, không được im lặng', () => {
  const thieu: HoSoTinDung = {
    ...hsGoc, id: 'hx', so_tien: null, han_xu_ly: null, ngay_nhan: null, ky_han: null,
    giu_tu: null, trang_thai: 'THU_THAP', loai_ho_so: 'CAP_MOI', ngay_den_han_ghtd: null,
    nhip_gan_nhat: '2026-08-11T02:00:00Z',
  };

  it('thiếu hạn xử lý thì KHÔNG bị coi là quá hạn', () => {
    // Không có hạn thì không có gì để trễ. Coi là quá hạn sẽ báo đỏ oan
    // toàn bộ 31 hồ sơ nhập từ Miro ngay hôm đầu tiên.
    expect(hsQuaHan(thieu, moc)).toBe(0);
  });

  it('mỗi ô trống thành một cảnh báo vàng', () => {
    const cb = canhBaoHoSo(thieu, moc);
    expect(cb.every((c) => c.muc === 'VANG')).toBe(true);
    expect(cb.some((c) => c.noi_dung.includes('số tiền'))).toBe(true);
    expect(cb.some((c) => c.noi_dung.includes('hạn xử lý'))).toBe(true);
    expect(cb.some((c) => c.noi_dung.includes('kỳ hạn'))).toBe(true);
  });

  it('thiếu ngày nhận thì đếm im lặng từ ngày hồ sơ vào hệ thống', () => {
    // created_at thứ Sáu 07/08 → tới thứ Tư 12/08 là 3 ngày làm việc
    expect(hsNgayImLang(
      { ...thieu, nhip_gan_nhat: null, created_at: '2026-08-07T02:00:00Z' }, moc,
    )).toBe(3);
  });

  it('thiếu số tiền thì hiện chữ, không hiện «0 triệu»', () => {
    expect(dinhDangTien(null)).toBe('chưa có số tiền');
  });

  /**
   * ĐÂY LÀ TEST ĐÁNG GIÁ NHẤT CỦA CẢ TỆP NÀY.
   *
   * Bản mã trước đó xếp thứ tự bằng `a.han_xu_ly.localeCompare(b.han_xu_ly)`.
   * Hai hồ sơ cùng cột, cùng thiếu số tiền → `b.so_tien - a.so_tien` ra 0 →
   * rơi xuống localeCompare trên `null` → TypeError → **trắng cả trang**.
   *
   * Lỗi này đã xảy ra thật trên production ngày 03/08/2026: dữ liệu có ô trống
   * vào database trước khi mã chịu được ô trống được triển khai. Test này giữ
   * cho nó không tái diễn.
   */
  it('xếp được cả cột toàn hồ sơ thiếu số tiền lẫn thiếu hạn — KHÔNG được ném lỗi', () => {
    const ds = [
      thieu,
      { ...thieu, id: 'hx2', khach_hang: 'Công ty B' },
      { ...thieu, id: 'hx3', khach_hang: 'Công ty C', so_tien: 30_000 },
      { ...thieu, id: 'hx4', khach_hang: 'Công ty D', han_xu_ly: '2026-09-01' },
    ];
    const xep = sapXepHoSo(ds, moc);
    expect(xep).toHaveLength(4);
    expect(xep[0].id).toBe('hx3');                       // có số tiền thì lên trước
    expect(xep.map((x) => x.id).sort()).toEqual(['hx', 'hx2', 'hx3', 'hx4']);
  });

  it('hồ sơ có hạn xếp trước hồ sơ chưa có hạn', () => {
    const coHan = { ...thieu, id: 'co-han', han_xu_ly: '2026-12-31' };
    expect(sapXepHoSo([thieu, coHan], moc)[0].id).toBe('co-han');
  });

  it('hồ sơ đã xong thì thôi không đòi bổ sung nữa', () => {
    expect(canhBaoHoSo({ ...thieu, trang_thai: 'HOAN_THANH' }, moc)).toEqual([]);
  });
});

describe('Ai được sửa số tiền — bản chiếu của trigger f_ct2_hs_truoc_sua', () => {
  it('lãnh đạo sửa được cả số đã có', () => {
    expect(hsSuaDuocSoTien({ so_tien: 160_000 }, true)).toBe(true);
    expect(hsSuaDuocSoTien({ so_tien: null }, true)).toBe(true);
  });

  it('cán bộ chỉ BỔ SUNG được khi đang trống — 16 hồ sơ thiếu số mà bắt 2 lãnh đạo điền hết là nút cổ chai', () => {
    expect(hsSuaDuocSoTien({ so_tien: null }, false)).toBe(true);
    expect(hsSuaDuocSoTien({ so_tien: 160_000 }, false)).toBe(false);
  });
});

describe('Dải «Đến hạn GHTD 2 tháng tới» — cột dẫn xuất, không phải trạng thái', () => {
  // moc = thứ Tư 12/08/2026
  const goc = { trang_thai: 'THU_THAP' as const, loai_ho_so: 'CAP_MOI' as const };

  it('trong cửa sổ 60 ngày thì vào dải, xa hơn thì không', () => {
    expect(hsThuocDaiDenHan({ ...goc, ngay_den_han_ghtd: '2026-09-30' }, moc)).toBe(true);
    expect(hsThuocDaiDenHan({ ...goc, ngay_den_han_ghtd: '2026-12-01' }, moc)).toBe(false);
  });

  it('đã quá hạn mức vẫn ở trong dải — đó là hồ sơ cần thấy nhất', () => {
    expect(hsThuocDaiDenHan({ ...goc, ngay_den_han_ghtd: '2026-07-31' }, moc)).toBe(true);
  });

  it('tái cấp/điều chỉnh CHƯA có ngày cũng vào dải — như hai thẻ Đông Dương trên Miro', () => {
    expect(hsThuocDaiDenHan({ ...goc, loai_ho_so: 'TAI_CAP', ngay_den_han_ghtd: null }, moc)).toBe(true);
    expect(hsThuocDaiDenHan({ ...goc, loai_ho_so: 'DIEU_CHINH', ngay_den_han_ghtd: null }, moc)).toBe(true);
    // Cấp mới không theo dõi hạn mức cũ — không có ngày là bình thường
    expect(hsThuocDaiDenHan({ ...goc, ngay_den_han_ghtd: null }, moc)).toBe(false);
  });

  it('hồ sơ đã xong / bị dừng thì rời dải', () => {
    expect(hsThuocDaiDenHan({ ...goc, trang_thai: 'HOAN_THANH', ngay_den_han_ghtd: '2026-08-20' }, moc)).toBe(false);
    expect(hsThuocDaiDenHan({ ...goc, trang_thai: 'TU_CHOI', ngay_den_han_ghtd: '2026-08-20' }, moc)).toBe(false);
  });
});


describe('Hồ sơ chưa cập nhật — cảnh báo bằng hình ảnh trên màn toàn cảnh', () => {
  // moc = 09:00 thứ Tư 12/08/2026
  const base = { ...hsGoc, trang_thai: 'THU_THAP' as const, ngay_nhan: '2026-08-03' };

  it('đếm im lặng bằng NGÀY LÀM VIỆC, không phải ngày lịch', () => {
    // Nhịp gần nhất thứ Sáu 07/08 → tới thứ Tư 12/08 là 3 ngày làm việc (10, 11, 12)
    expect(hsNgayImLang({ ...base, nhip_gan_nhat: '2026-08-07T02:00:00Z' }, moc)).toBe(3);
    // Ghi hôm qua thì chưa im lặng
    expect(hsNgayImLang({ ...base, nhip_gan_nhat: '2026-08-11T02:00:00Z' }, moc)).toBe(1);
  });

  it('ba mức: mới · chậm · bỏ quên', () => {
    expect(hsMucImLang({ ...base, nhip_gan_nhat: '2026-08-11T02:00:00Z' }, moc)).toBe('MOI');
    expect(hsMucImLang({ ...base, nhip_gan_nhat: '2026-08-10T02:00:00Z' }, moc)).toBe('CHAM');
    expect(hsMucImLang({ ...base, nhip_gan_nhat: '2026-08-06T02:00:00Z' }, moc)).toBe('BO_QUEN');
  });

  it('chưa ghi nhịp lần nào thì tính từ ngày nhận hồ sơ', () => {
    const h = { ...base, nhip_gan_nhat: null };
    expect(hsChuaGhiLanNao(h)).toBe(true);
    // Nhận 03/08 (thứ Hai) → 12/08 là 7 ngày làm việc
    expect(hsNgayImLang(h, moc)).toBe(7);
    expect(hsMucImLang(h, moc)).toBe('BO_QUEN');
  });

  it('hồ sơ đã xong hoặc bị từ chối thì thôi không đòi cập nhật nữa', () => {
    expect(hsNgayImLang({ ...base, trang_thai: 'HOAN_THANH', nhip_gan_nhat: null }, moc)).toBe(0);
    expect(hsMucImLang({ ...base, trang_thai: 'TU_CHOI', nhip_gan_nhat: null }, moc)).toBe('MOI');
  });

  it('bỏ quên vào thẳng danh sách cảnh báo, mức đỏ', () => {
    const cb = canhBaoHoSo({ ...base, nhip_gan_nhat: null, ngay_den_han_ghtd: null, loai_ho_so: 'CAP_MOI' }, moc);
    const im = cb.find((c) => c.noi_dung.includes('Chưa cập nhật'));
    expect(im?.muc).toBe('DO');
    expect(im?.noi_dung).toContain('lần nào');
  });
});
