import { describe, expect, it } from 'vitest';
import {
  chuanBiQuaLau,
  demTruongCongA,
  demWip,
  diemRuiRo,
  goiYNhan,
  kiemTraCauNhip,
  kiemTraCongA,
  locEmojiTieuDe,
  lyDoChanChuyen,
  sapXepThe,
  soNgayImLang,
  soNgayQuaHan,
  tuoiCho,
  type BoiCanhChuyen,
  type Ct2DauViec,
  type Ct2FormTao,
} from './ct2';

const formDu: Ct2FormTao = {
  tieu_de: 'Hoàn thiện hồ sơ TSBĐ khách hàng Minh Long',
  ket_qua_dau_ra: 'Bộ hồ sơ TSBĐ đầy đủ, đã đăng ký GDBĐ',
  muc_tieu_lien_ket: 'chien-dich-casa',
  cach_lam: 'B1 rà danh mục giấy tờ; B2 hẹn khách bổ sung; B3 trình ký và đăng ký GDBĐ.',
  chi_tieu_dinh_luong: '3',
  co_chi_tieu_so: true,
  don_vi: 'hồ sơ',
  nguoi_chiu_trach_nhiem: 'p1',
  lanh_dao_theo_doi: 'p2',
  phong: 'd1',
  pham_vi: 'PHONG',
  loai_dau_viec: 'TIEN_TRINH',
  ngay_bat_dau: '2026-08-01',
  han_hoan_thanh: '2026-08-20',
  lien_phong: false,
  cac_phong_tham_gia: [],
};

describe('Cổng A — kiểm tra 5W2H lúc tạo', () => {
  it('form đủ trường thì không còn thiếu gì', () => {
    expect(kiemTraCongA(formDu)).toEqual([]);
  });

  it('chặn tiêu đề ngắn và tiêu đề rỗng nghĩa', () => {
    expect(kiemTraCongA({ ...formDu, tieu_de: 'Theo dõi' }).some((t) => t.truong === 'tieu_de')).toBe(true);
    expect(kiemTraCongA({ ...formDu, tieu_de: 'theo dõi   ' }).some((t) => t.truong === 'tieu_de')).toBe(true);
  });

  it('thiếu người chịu trách nhiệm là thiếu — không cho «gán sau»', () => {
    const thieu = kiemTraCongA({ ...formDu, nguoi_chiu_trach_nhiem: '' });
    expect(thieu.some((t) => t.truong === 'nguoi_chiu_trach_nhiem')).toBe(true);
  });

  it('hạn hoàn thành trước ngày bắt đầu bị chặn', () => {
    const thieu = kiemTraCongA({ ...formDu, han_hoan_thanh: '2026-07-01' });
    expect(thieu.some((t) => t.truong === 'han_hoan_thanh')).toBe(true);
  });

  it('liên phòng bắt buộc chọn phòng tham gia', () => {
    const thieu = kiemTraCongA({ ...formDu, lien_phong: true, cac_phong_tham_gia: [] });
    expect(thieu.some((t) => t.truong === 'cac_phong_tham_gia')).toBe(true);
  });

  it('việc không có chỉ tiêu số thì không đòi chỉ tiêu định lượng', () => {
    const thieu = kiemTraCongA({ ...formDu, co_chi_tieu_so: false, chi_tieu_dinh_luong: '', don_vi: '' });
    expect(thieu).toEqual([]);
  });

  it('thanh tiến độ đếm đúng số trường', () => {
    expect(demTruongCongA(formDu)).toEqual({ du: 13, tong: 13 });
    const { du, tong } = demTruongCongA({ ...formDu, tieu_de: '', cach_lam: '' });
    expect(tong).toBe(13);
    expect(du).toBe(11);
  });
});

describe('Cổng B — câu nhịp hằng ngày', () => {
  const chuan = { noiDung: 'Đã xong bước rà hồ sơ, mai trình ký', co: 'XANH' as const, vuongMac: '', hanhDongHomNay: '', cauGanNhat: null };

  it('câu đạt chuẩn thì hợp lệ', () => {
    expect(kiemTraCauNhip(chuan).hopLe).toBe(true);
  });

  it('chặn câu ngắn và câu thuộc danh sách chặn', () => {
    expect(kiemTraCauNhip({ ...chuan, noiDung: 'đang làm' }).hopLe).toBe(false);
    expect(kiemTraCauNhip({ ...chuan, noiDung: 'Bình thường' }).hopLe).toBe(false);
  });

  it('chặn copy-paste giống hệt câu gần nhất', () => {
    const kq = kiemTraCauNhip({ ...chuan, cauGanNhat: 'Đã xong bước rà hồ sơ, mai trình ký' });
    expect(kq.hopLe).toBe(false);
    expect(kq.loi).toContain('giống hệt');
  });

  it('cờ vàng/đỏ bắt buộc tách vướng mắc + hành động hôm nay', () => {
    expect(kiemTraCauNhip({ ...chuan, co: 'DO' }).hopLe).toBe(false);
    expect(kiemTraCauNhip({ ...chuan, co: 'DO', vuongMac: 'Chờ khách bổ sung sổ đỏ' }).hopLe).toBe(false);
    expect(kiemTraCauNhip({
      ...chuan, co: 'DO',
      vuongMac: 'Chờ khách bổ sung sổ đỏ',
      hanhDongHomNay: 'Gọi lại khách hẹn nộp trước thứ 5',
    }).hopLe).toBe(true);
  });
});

describe('Luật chuyển trạng thái — PDCA khép vòng ở cấp thẻ', () => {
  const bc: BoiCanhChuyen = { coDongP: true, coDongC: false, coDongA: false, phanTram: 50, laLanhDao: false, loai: 'TIEN_TRINH' };

  it('Chuẩn bị → Đang làm cần dòng P', () => {
    expect(lyDoChanChuyen('CHUAN_BI', 'DANG_LAM', { ...bc, coDongP: false })).toContain('Plan');
    expect(lyDoChanChuyen('CHUAN_BI', 'DANG_LAM', bc)).toBeNull();
  });

  it('Hoàn thành cần 100% và dòng C', () => {
    expect(lyDoChanChuyen('DANG_LAM', 'HOAN_THANH', bc)).toContain('100%');
    expect(lyDoChanChuyen('DANG_LAM', 'HOAN_THANH', { ...bc, phanTram: 100 })).toContain('Check');
    expect(lyDoChanChuyen('DANG_LAM', 'HOAN_THANH', { ...bc, phanTram: 100, coDongC: true })).toBeNull();
  });

  it('Đã đóng cần lãnh đạo + dòng A', () => {
    expect(lyDoChanChuyen('HOAN_THANH', 'DA_DONG', { ...bc, coDongA: true })).toContain('Trưởng/Phó');
    expect(lyDoChanChuyen('HOAN_THANH', 'DA_DONG', { ...bc, laLanhDao: true })).toContain('Act');
    expect(lyDoChanChuyen('HOAN_THANH', 'DA_DONG', { ...bc, laLanhDao: true, coDongA: true })).toBeNull();
  });

  it('việc THƯỜNG TRỰC không vào cột tiến trình', () => {
    expect(lyDoChanChuyen('DANG_LAM', 'CHO_DUYET', { ...bc, loai: 'THUONG_TRUC' })).toContain('THƯỜNG TRỰC');
  });
});

describe('Cảnh báo ngoại lệ', () => {
  const goc: Ct2DauViec = {
    id: 'x', cycle_id: null, chien_dich_id: null, ma_hien_thi: 'KHDN-2608-001',
    tieu_de: 'Hoàn thiện hồ sơ TSBĐ KH Minh Long', ket_qua_dau_ra: 'Bộ hồ sơ',
    muc_tieu_lien_ket: 'casa', cach_lam: 'các bước triển khai chi tiết đầy đủ',
    chi_tieu_dinh_luong: null, don_vi: null, nguon_luc_du_kien: null,
    nguoi_chiu_trach_nhiem: 'p1', nguoi_phoi_hop: [], lanh_dao_theo_doi: 'p2',
    phong: 'd1', pham_vi: 'PHONG', loai_dau_viec: 'TIEN_TRINH', lien_phong: false,
    cac_phong_tham_gia: [], muc_uu_tien: 'THUONG', trang_thai: 'DANG_LAM',
    phan_tram: 40, co_tinh_trang: 'XANH', ngay_bat_dau: '2026-08-01',
    han_hoan_thanh: '2026-08-10', han_goc: '2026-08-10', ly_do_dung_huy: null,
    nguoi_dang_giu: null, giu_tu: null, nhip_gan_nhat: '2026-08-05T00:30:00Z',
    nguoi_tao: 'p2', created_at: '2026-08-01T01:00:00Z', updated_at: '2026-08-05T01:00:00Z',
  };
  const moc = new Date('2026-08-12T02:00:00Z'); // 09:00 VN ngày 12/08

  it('tính đúng số ngày quá hạn và im lặng', () => {
    expect(soNgayQuaHan(goc, moc)).toBe(2);
    expect(soNgayImLang(goc, moc)).toBe(7);
    expect(soNgayQuaHan({ ...goc, trang_thai: 'HOAN_THANH' }, moc)).toBe(0);
  });

  it('cột chờ: đồng hồ đổi chủ — không tính im lặng cho người phụ trách', () => {
    const cho = { ...goc, trang_thai: 'CHO_DUYET' as const, giu_tu: '2026-08-06T01:00:00Z' };
    expect(soNgayImLang(cho, moc)).toBe(0);
    expect(tuoiCho(cho, moc)).toBe(6);
  });

  it('điểm rủi ro theo đúng công thức M4', () => {
    // 2 ngày quá hạn × 3 + 7 ngày im lặng × 2 = 20; +5 trọng điểm; +3 liên phòng
    expect(diemRuiRo(goc, moc)).toBe(20);
    expect(diemRuiRo({ ...goc, muc_uu_tien: 'TRONG_DIEM_BGD', lien_phong: true }, moc)).toBe(28);
  });

  it('chuẩn bị quá lâu khi còn ≤ 25% quỹ thời gian', () => {
    expect(chuanBiQuaLau({ trang_thai: 'CHUAN_BI', ngay_bat_dau: '2026-08-01', han_hoan_thanh: '2026-08-10' }, moc)).toBe(true);
    expect(chuanBiQuaLau({ trang_thai: 'CHUAN_BI', ngay_bat_dau: '2026-08-10', han_hoan_thanh: '2026-09-30' }, moc)).toBe(false);
  });

  it('đếm WIP theo người, xếp thẻ đỏ/trọng điểm lên trước', () => {
    const ds = [goc, { ...goc, id: 'y', co_tinh_trang: 'DO' as const }, { ...goc, id: 'z', trang_thai: 'CHUAN_BI' as const }];
    expect(demWip(ds).get('p1')).toBe(2);
    expect(sapXepThe(ds, moc)[0].id).toBe('y');
  });
});

describe('Tiện ích', () => {
  it('gợi ý nhãn PDCA theo ngữ cảnh', () => {
    expect(goiYNhan('CHUAN_BI', 0)).toBe('P');
    expect(goiYNhan('DANG_LAM', 50)).toBe('D');
    expect(goiYNhan('DANG_LAM', 100)).toBe('C');
    expect(goiYNhan('HOAN_THANH', 100)).toBe('C');
  });

  it('lọc emoji khỏi tên đầu việc', () => {
    expect(locEmojiTieuDe('Tăng CASA 🔥🔥 quý IV')).toBe('Tăng CASA quý IV');
  });
});
