import { describe, expect, it } from 'vitest';
import {
  cauPlanTuKeHoach,
  chuanBiQuaLau,
  daDuKeHoach,
  demWip,
  diemRuiRo,
  goiYNhan,
  gopCacBuoc,
  hanGoiY,
  kiemTraCauNhip,
  kiemTraGhiViec,
  kiemTraKeHoach,
  locEmojiTieuDe,
  lyDoChanChuyen,
  sapXepThe,
  soNgayImLang,
  soNgayQuaHan,
  tachCacBuoc,
  tuoiCho,
  type BoiCanhChuyen,
  type Ct2DauViec,
  type Ct2FormGhiViec,
  type Ct2FormKeHoach,
} from './ct2';

// ---------------------------------------------------------------------------
// CỔNG 1 — ghi việc: đúng 3 điều, làm được ngay trong cuộc họp giao ban
// ---------------------------------------------------------------------------

const ghiViecDu: Ct2FormGhiViec = {
  nguon_viec: 'GIAO_BAN',
  cuoc_hop: 'Giao ban tuần 32/2026',
  tieu_de: 'Hoàn thiện hồ sơ TSBĐ khách hàng Minh Long',
  nguoi_chiu_trach_nhiem: 'p1',
  han_hoan_thanh: '2026-08-20',
};

describe('Cổng 1 — ghi việc (3 trường)', () => {
  it('đủ ba điều là ghi được, không đòi thêm gì', () => {
    expect(kiemTraGhiViec(ghiViecDu)).toEqual([]);
  });

  it('chặn tên việc ngắn và tên rỗng nghĩa', () => {
    expect(kiemTraGhiViec({ ...ghiViecDu, tieu_de: 'Xem lại' }).some((t) => t.truong === 'tieu_de')).toBe(true);
    expect(kiemTraGhiViec({ ...ghiViecDu, tieu_de: 'theo dõi' }).some((t) => t.truong === 'tieu_de')).toBe(true);
  });

  it('không cho «gán sau» — phải có đúng 01 người ngay lúc ghi', () => {
    expect(kiemTraGhiViec({ ...ghiViecDu, nguoi_chiu_trach_nhiem: '' })
      .some((t) => t.truong === 'nguoi_chiu_trach_nhiem')).toBe(true);
  });

  it('phải có hạn — không có hạn thì không biết đúng hẹn hay không', () => {
    expect(kiemTraGhiViec({ ...ghiViecDu, han_hoan_thanh: '' })
      .some((t) => t.truong === 'han_hoan_thanh')).toBe(true);
  });

  it('KHÔNG đòi kết quả/mục tiêu/cách làm ở cổng này — đó là việc của Cổng 2', () => {
    // Cả form chỉ có 5 khóa; nếu ai đó thêm trường bắt buộc vào đây, test này gãy
    expect(Object.keys(ghiViecDu).sort()).toEqual(
      ['cuoc_hop', 'han_hoan_thanh', 'nguoi_chiu_trach_nhiem', 'nguon_viec', 'tieu_de'],
    );
  });
});

describe('Hạn chọn bằng cụm từ đời thường', () => {
  it('cho mốc tương lai, không lặp, không có mốc đã qua', () => {
    const ds = hanGoiY(new Date('2026-08-03T02:00:00Z')); // thứ 2, 09:00 VN
    expect(ds.length).toBeGreaterThanOrEqual(2);
    for (const m of ds) expect(m.ngay >= '2026-08-03').toBe(true);
    expect(new Set(ds.map((m) => m.ngay)).size).toBe(ds.length);
  });

  it('«Cuối tuần này» rơi đúng thứ 6', () => {
    const ds = hanGoiY(new Date('2026-08-03T02:00:00Z'));
    const t6 = ds.find((m) => m.nhan === 'Cuối tuần này');
    expect(t6?.ngay).toBe('2026-08-07');
    expect(new Date(`${t6?.ngay}T00:00:00`).getDay()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// CỔNG 2 — lập kế hoạch làm: 3 câu hỏi, mở lúc khởi động việc
// ---------------------------------------------------------------------------

const keHoachDu: Ct2FormKeHoach = {
  ket_qua_dau_ra: 'Bộ hồ sơ đã đăng ký GDBĐ, đủ điều kiện giải ngân',
  muc_tieu_lien_ket: 'Tăng trưởng tín dụng',
  cac_buoc: ['Rà danh mục giấy tờ còn thiếu', 'Hẹn khách bổ sung trong tuần', ''],
  chi_tieu_so: '3',
  don_vi: 'hồ sơ',
};

describe('Cổng 2 — lập kế hoạch làm', () => {
  it('đủ ba câu trả lời thì qua', () => {
    expect(kiemTraKeHoach(keHoachDu)).toEqual([]);
  });

  it('đo bằng SỐ BƯỚC, không bắt người dùng đếm ký tự', () => {
    const motBuoc = kiemTraKeHoach({ ...keHoachDu, cac_buoc: ['Gọi khách', '', ''] });
    expect(motBuoc.some((t) => t.truong === 'cac_buoc')).toBe(true);
    // Hai bước ngắn vẫn qua, dù tổng số ký tự ít hơn ngưỡng 30 của bản cũ
    expect(kiemTraKeHoach({ ...keHoachDu, cac_buoc: ['Gọi khách', 'Trình ký', ''] })).toEqual([]);
  });

  it('thiếu kết quả đầu ra hoặc mục tiêu đều bị chặn', () => {
    expect(kiemTraKeHoach({ ...keHoachDu, ket_qua_dau_ra: '' })
      .some((t) => t.truong === 'ket_qua_dau_ra')).toBe(true);
    expect(kiemTraKeHoach({ ...keHoachDu, muc_tieu_lien_ket: '' })
      .some((t) => t.truong === 'muc_tieu_lien_ket')).toBe(true);
  });

  it('chỉ tiêu là tùy chọn — nhiều việc không đo bằng số', () => {
    expect(kiemTraKeHoach({ ...keHoachDu, chi_tieu_so: '', don_vi: '' })).toEqual([]);
  });

  it('các bước gộp về một trường và tách ngược lại được', () => {
    const gop = gopCacBuoc(keHoachDu.cac_buoc);
    expect(gop).toBe('B1. Rà danh mục giấy tờ còn thiếu\nB2. Hẹn khách bổ sung trong tuần');
    expect(tachCacBuoc(gop)).toEqual([
      'Rà danh mục giấy tờ còn thiếu', 'Hẹn khách bổ sung trong tuần', '',
    ]);
  });

  it('câu Plan (P) tự sinh từ kế hoạch — cán bộ không phải gõ lại', () => {
    const cau = cauPlanTuKeHoach(keHoachDu);
    expect(cau).toContain('2 bước');
    expect(cau).toContain('Rà danh mục giấy tờ còn thiếu');
    expect(cau).toContain('Chỉ tiêu: 3 hồ sơ');
    // Phải qua được chính bộ lọc câu nhịp của hệ thống
    expect(kiemTraCauNhip({
      noiDung: cau, co: 'XANH', vuongMac: '', hanhDongHomNay: '', cauGanNhat: null,
    }).hopLe).toBe(true);
  });

  it('nhận biết thẻ đã đủ kế hoạch để khởi động', () => {
    expect(daDuKeHoach({ ket_qua_dau_ra: null, muc_tieu_lien_ket: null, cach_lam: null })).toBe(false);
    expect(daDuKeHoach({
      ket_qua_dau_ra: keHoachDu.ket_qua_dau_ra,
      muc_tieu_lien_ket: keHoachDu.muc_tieu_lien_ket,
      cach_lam: gopCacBuoc(keHoachDu.cac_buoc),
    })).toBe(true);
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
    nguon_viec: 'CHU_DONG', cuoc_hop: null, nguoi_tao: 'p2', created_at: '2026-08-01T01:00:00Z', updated_at: '2026-08-05T01:00:00Z',
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
