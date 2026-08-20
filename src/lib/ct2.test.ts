import { describe, expect, it } from 'vitest';
import {
  cauPlanTuKeHoach,
  chuanBiQuaLau,
  daDuKeHoach,
  demWip,
  diemRuiRo,
  duongDanThongBao,
  laNgayLamViec,
  moduleThongBao,
  goiYNhan,
  gopCacBuoc,
  hanGoiY,
  kiemTraCauNhip,
  kiemTraGhiViec,
  khiNaoThongBao,
  kiemTraKeHoach,
  soNgayLamViec,
  locEmojiTieuDe,
  lyDoChanChuyen,
  mucChuY,
  trongKhungNhip,
  sapXepThe,
  soNgayImLang,
  soNgayQuaHan,
  tachCacBuoc,
  thieuTruongBatBuoc,
  tuoiCho,
  type BoiCanhChuyen,
  type Ct2DauViec,
  type Ct2FormGhiViec,
  type Ct2FormKeHoach,
} from './ct2';
import { dauTuanVn } from '@/components/one/move2/useCt2Bgd';

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
    // Quá hạn đếm NGÀY LỊCH: hạn 10/08 → 12/08 là trễ 2 ngày với BGĐ và khách
    expect(soNgayQuaHan(goc, moc)).toBe(2);
    // Im lặng đếm NGÀY LÀM VIỆC: nhịp gần nhất 05/08 (thứ 4) → 12/08 (thứ 4) là
    // 7 ngày lịch nhưng chỉ 5 ngày làm việc (6, 7, 10, 11, 12) — hai ngày nghỉ
    // không phải lỗi của ai
    expect(soNgayImLang(goc, moc)).toBe(5);
    expect(soNgayQuaHan({ ...goc, trang_thai: 'HOAN_THANH' }, moc)).toBe(0);
  });

  it('cột chờ: đồng hồ đổi chủ — không tính im lặng cho người phụ trách', () => {
    const cho = { ...goc, trang_thai: 'CHO_DUYET' as const, giu_tu: '2026-08-06T01:00:00Z' };
    expect(soNgayImLang(cho, moc)).toBe(0);
    // Giữ từ 06/08 (thứ 5) → 12/08 (thứ 4): 6 ngày lịch, 4 ngày làm việc
    expect(tuoiCho(cho, moc)).toBe(4);
  });

  it('điểm rủi ro theo đúng công thức M4', () => {
    // 2 ngày quá hạn (lịch) × 3 + 5 ngày im lặng (làm việc) × 2 = 16;
    // +5 trọng điểm; +3 liên phòng
    expect(diemRuiRo(goc, moc)).toBe(16);
    expect(diemRuiRo({ ...goc, muc_uu_tien: 'TRONG_DIEM_BGD', lien_phong: true }, moc)).toBe(24);
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

describe('Chế độ Toàn cảnh — gộp mọi tín hiệu xấu về một thang màu', () => {
  const nen = {
    trang_thai: 'DANG_LAM' as const, co_tinh_trang: 'XANH' as const,
    han_hoan_thanh: '2026-08-20', giu_tu: null, nhip_gan_nhat: '2026-08-12T00:30:00Z',
    ngay_bat_dau: '2026-08-01', ket_qua_dau_ra: 'Bộ hồ sơ đã xong',
    muc_tieu_lien_ket: 'Tăng trưởng tín dụng',
    cach_lam: 'B1. Rà hồ sơ\nB2. Trình ký duyệt lần cuối',
    // Việc «bình thường» nay phải có đủ chủ và lãnh đạo theo dõi mới được XANH:
    // xanh nghĩa là «ổn», mà một thẻ vô chủ thì không ổn.
    nguoi_chiu_trach_nhiem: 'p1', lanh_dao_theo_doi: 'p2',
    loai_dau_viec: 'TIEN_TRINH' as const, created_at: '2026-08-01T01:00:00Z',
  };
  const moc = new Date('2026-08-12T02:00:00Z');

  it('việc đang chạy bình thường là xanh', () => {
    expect(mucChuY(nen, moc)).toBe('XANH');
  });

  it('quá hạn, cờ đỏ hay nghẽn cột chờ đều thành đỏ', () => {
    expect(mucChuY({ ...nen, han_hoan_thanh: '2026-08-05' }, moc)).toBe('DO');
    expect(mucChuY({ ...nen, co_tinh_trang: 'DO' }, moc)).toBe('DO');
    expect(mucChuY({
      ...nen, trang_thai: 'CHO_DUYET', giu_tu: '2026-08-05T02:00:00Z',
    }, moc)).toBe('DO');
  });

  it('cờ vàng, im lặng 3 ngày, hay chuẩn bị mà chưa lập kế hoạch đều thành vàng', () => {
    expect(mucChuY({ ...nen, co_tinh_trang: 'VANG' }, moc)).toBe('VANG');
    expect(mucChuY({ ...nen, nhip_gan_nhat: '2026-08-08T00:30:00Z' }, moc)).toBe('VANG');
    expect(mucChuY({
      ...nen, trang_thai: 'CHUAN_BI', ket_qua_dau_ra: null, cach_lam: null,
    }, moc)).toBe('VANG');
  });

  it('thẻ đã đóng hoặc hủy không còn đòi chú ý', () => {
    expect(mucChuY({ ...nen, trang_thai: 'DA_DONG', han_hoan_thanh: '2026-08-01' }, moc)).toBe('XONG');
    expect(mucChuY({ ...nen, trang_thai: 'DUNG_HUY' }, moc)).toBe('XONG');
  });
});

describe('Khung giờ nhịp sáng — quyết định có tự làm tươi bảng hay không', () => {
  it('trong giờ nhịp ngày làm việc thì bật', () => {
    // Thứ 4 12/08/2026, 07:30 giờ VN
    expect(trongKhungNhip(new Date('2026-08-12T00:30:00Z'))).toBe(true);
    // 08:30 vẫn còn trong khung lãnh đạo
    expect(trongKhungNhip(new Date('2026-08-12T01:30:00Z'))).toBe(true);
  });

  it('ngoài khung giờ thì tắt — không tốn query khi chẳng có gì đổi', () => {
    expect(trongKhungNhip(new Date('2026-08-12T03:00:00Z'))).toBe(false);  // 10:00
    expect(trongKhungNhip(new Date('2026-08-11T23:00:00Z'))).toBe(false);  // 06:00
  });

  it('cuối tuần không đòi nhịp nên cũng không làm tươi', () => {
    // Thứ 7 15/08/2026, 07:30 giờ VN
    expect(trongKhungNhip(new Date('2026-08-15T00:30:00Z'))).toBe(false);
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

describe('Mốc tuần của dấu ấn — phải trùng mốc tuần Kanban (T2 00:00 giờ VN)', () => {
  it('mọi ngày trong tuần đều quy về đúng thứ Hai của tuần đó', () => {
    // Thứ 4 12/08/2026 → thứ 2 là 10/08
    expect(dauTuanVn(new Date('2026-08-12T02:00:00Z'))).toBe('2026-08-10');
    // Chính thứ 2 10/08 → giữ nguyên
    expect(dauTuanVn(new Date('2026-08-10T02:00:00Z'))).toBe('2026-08-10');
    // Chủ nhật 16/08 vẫn thuộc tuần bắt đầu 10/08 (không nhảy sang tuần sau)
    expect(dauTuanVn(new Date('2026-08-16T02:00:00Z'))).toBe('2026-08-10');
    // Thứ 2 17/08 sang tuần mới
    expect(dauTuanVn(new Date('2026-08-17T02:00:00Z'))).toBe('2026-08-17');
  });

  it('tính theo giờ Việt Nam, không theo giờ máy chủ', () => {
    // 23:30 UTC Chủ nhật 16/08 = 06:30 thứ 2 17/08 giờ VN → tuần mới
    expect(dauTuanVn(new Date('2026-08-16T23:30:00Z'))).toBe('2026-08-17');
  });
});


describe('Thông báo — bấm vào phải mở đúng thứ nó nói tới', () => {
  it('thông báo gắn với một đầu việc thì mở thẳng thẻ đó', () => {
    expect(duongDanThongBao({ ma_su_kien: 'N13', dau_viec_id: 'abc-123' }))
      .toBe('/one/chieu-thuc-2?the=abc-123');
    // Kể cả tin của bàn tín dụng, nếu có đầu việc thì đầu việc thắng
    expect(duongDanThongBao({ ma_su_kien: 'HS_TRINH', dau_viec_id: 'x1' }))
      .toBe('/one/chieu-thuc-2?the=x1');
  });

  it('tin hồ sơ tín dụng mở đúng tab tín dụng, không phải tab mặc định', () => {
    expect(duongDanThongBao({ ma_su_kien: 'HS_TRINH', dau_viec_id: null }))
      .toBe('/one/chieu-thuc-2?tab=tin-dung');
    expect(duongDanThongBao({ ma_su_kien: 'HS_TU_CHOI', dau_viec_id: null }))
      .toBe('/one/chieu-thuc-2?tab=tin-dung');
  });

  it('tin không gắn đối tượng nào thì về trang Chiêu thức 2', () => {
    expect(duongDanThongBao({ ma_su_kien: 'N12', dau_viec_id: null }))
      .toBe('/one/chieu-thuc-2');
  });

  it('mốc thời gian đọc được bằng lời, không phải dấu thời gian đầy đủ', () => {
    const moc = new Date('2026-08-12T08:00:00Z');
    expect(khiNaoThongBao('2026-08-12T07:59:40Z', moc)).toBe('vừa xong');
    expect(khiNaoThongBao('2026-08-12T07:45:00Z', moc)).toBe('15 phút trước');
    expect(khiNaoThongBao('2026-08-12T03:00:00Z', moc)).toBe('5 giờ trước');
    // Quá một ngày thì quay về ngày tháng — «37 giờ trước» không giúp ai
    expect(khiNaoThongBao('2026-08-09T08:00:00Z', moc)).toContain('2026');
  });
});


describe('Nhịp chỉ chạy thứ 2 → thứ 6', () => {
  // Mốc thật: 07/08/2026 là thứ Sáu, 08–09/08 cuối tuần, 10/08 thứ Hai.
  const T6 = '2026-08-07T09:00:00+07:00';
  const T7 = new Date('2026-08-08T09:00:00+07:00');
  const CN = new Date('2026-08-09T09:00:00+07:00');
  const T2 = new Date('2026-08-10T09:00:00+07:00');

  it('nhận đúng ngày làm việc theo lịch Việt Nam', () => {
    expect(laNgayLamViec(T7)).toBe(false);
    expect(laNgayLamViec(CN)).toBe(false);
    expect(laNgayLamViec(T2)).toBe(true);
    expect(laNgayLamViec(new Date(T6))).toBe(true);
  });

  it('thứ Sáu → thứ Hai chỉ là MỘT ngày làm việc, không phải ba', () => {
    expect(soNgayLamViec(T6, T2)).toBe(1);
    // Trong chính cuối tuần thì chưa trôi ngày làm việc nào
    expect(soNgayLamViec(T6, T7)).toBe(0);
    expect(soNgayLamViec(T6, CN)).toBe(0);
  });

  it('trọn một tuần = 5 ngày làm việc, mốc sau mốc trước = 0', () => {
    expect(soNgayLamViec('2026-08-03T09:00:00+07:00', new Date('2026-08-10T09:00:00+07:00'))).toBe(5);
    expect(soNgayLamViec(T2, new Date(T6))).toBe(0);
    expect(soNgayLamViec(T2, T2)).toBe(0);
  });

  it('thẻ chờ từ chiều thứ Sáu KHÔNG bị báo nghẽn vào sáng thứ Hai', () => {
    const the = { trang_thai: 'CHO_DUYET' as const, giu_tu: '2026-08-07T16:30:00+07:00' };
    // Ngày lịch là 3, nhưng người giữ mới có đúng 1 ngày làm việc để xử lý
    expect(tuoiCho(the, T2)).toBe(1);
    expect(tuoiCho(the, T2)).toBeLessThanOrEqual(3); // dưới ngưỡng escalate
    // Sang thứ Năm 13/08 thì mới thật sự quá ngưỡng 3 ngày làm việc
    expect(tuoiCho(the, new Date('2026-08-13T09:00:00+07:00'))).toBe(4);
  });

  it('thẻ đang làm không bị tính im lặng trong hai ngày nghỉ', () => {
    const the = {
      trang_thai: 'DANG_LAM' as const,
      nhip_gan_nhat: '2026-08-07T07:30:00+07:00',
      ngay_bat_dau: '2026-08-01',
    };
    expect(soNgayImLang(the, T2)).toBe(1);
    expect(soNgayImLang(the, CN)).toBe(0);
  });

  it('nhưng QUÁ HẠN vẫn đếm ngày lịch — hạn là lời hứa theo tờ lịch', () => {
    const the = { trang_thai: 'DANG_LAM' as const, han_hoan_thanh: '2026-08-07' };
    expect(soNgayQuaHan(the, T2)).toBe(3);
  });
});


describe('Thẻ nhập từ board cũ — ô trống phải nói ra, không được im lặng', () => {
  const goc: Ct2DauViec = {
    id: 'x', cycle_id: null, chien_dich_id: null, ma_hien_thi: 'KHDN-2608-050',
    tieu_de: 'KHAI THÁC NGUỒN VỐN KHCN BIG4', ket_qua_dau_ra: null,
    muc_tieu_lien_ket: null, cach_lam: null,
    chi_tieu_dinh_luong: null, don_vi: null, nguon_luc_du_kien: null,
    nguoi_chiu_trach_nhiem: null, nguoi_phoi_hop: [], lanh_dao_theo_doi: null,
    phong: 'd1', pham_vi: 'PHONG', loai_dau_viec: 'TIEN_TRINH', lien_phong: false,
    cac_phong_tham_gia: [], muc_uu_tien: 'THUONG', trang_thai: 'DANG_LAM',
    phan_tram: 0, co_tinh_trang: 'XANH', ngay_bat_dau: null,
    han_hoan_thanh: null, han_goc: null, ly_do_dung_huy: null,
    nguoi_dang_giu: null, giu_tu: null, nhip_gan_nhat: null,
    nguon_viec: 'CHU_DONG', cuoc_hop: null, nguoi_tao: 'p2',
    created_at: '2026-08-07T01:00:00Z', updated_at: '2026-08-07T01:00:00Z',
  };
  const moc = new Date('2026-08-12T02:00:00Z'); // 09:00 VN thứ Tư 12/08

  it('thiếu hạn thì KHÔNG bị coi là quá hạn', () => {
    // Coi thiếu hạn là quá hạn sẽ báo đỏ oan mọi thẻ nhập từ board cũ ngay
    // hôm đầu tiên — cái thiếu ở đây là dữ liệu, không phải tiến độ.
    expect(soNgayQuaHan(goc, moc)).toBe(0);
  });

  it('liệt kê đúng các trường bắt buộc còn thiếu', () => {
    const t = thieuTruongBatBuoc(goc).map((x) => x.truong);
    expect(t).toContain('nguoi_chiu_trach_nhiem');
    expect(t).toContain('han_hoan_thanh');
    expect(t).toContain('ngay_bat_dau');
    expect(t).toContain('lanh_dao_theo_doi');
  });

  it('việc THƯỜNG TRỰC không bị đòi hạn — sai loại thước', () => {
    const tt = thieuTruongBatBuoc({ ...goc, loai_dau_viec: 'THUONG_TRUC' });
    expect(tt.some((x) => x.truong === 'han_hoan_thanh')).toBe(false);
  });

  it('việc đã đóng thì thôi không đòi bổ sung nữa', () => {
    expect(thieuTruongBatBuoc({ ...goc, trang_thai: 'DA_DONG' })).toEqual([]);
  });

  it('thiếu trường bắt buộc là VÀNG — dứt khoát không được XANH', () => {
    expect(mucChuY(goc, moc)).toBe('VANG');
  });

  it('thiếu ngày bắt đầu thì đếm im lặng từ ngày thẻ vào hệ thống', () => {
    // created_at thứ Sáu 07/08 → thứ Tư 12/08 là 3 ngày làm việc (10, 11, 12)
    expect(soNgayImLang(goc, moc)).toBe(3);
  });

  it('thẻ vô chủ không cộng vào WIP của ai', () => {
    const wip = demWip([goc, { ...goc, id: 'y', nguoi_chiu_trach_nhiem: 'p1' }]);
    expect(wip.get('p1')).toBe(1);
    expect(wip.size).toBe(1);
  });

  /**
   * ĐÂY LÀ TEST ĐÁNG GIÁ NHẤT CỦA CẢ NHÓM NÀY.
   *
   * Đúng dòng `a.han_hoan_thanh.localeCompare(...)` ở bàn PDTD đã làm TRẮNG CẢ
   * MÀN ngày 03/08/2026 khi dữ liệu có ô trống vào database trước bản mã chịu
   * được ô trống. Bàn đầu việc có y hệt dòng đó — bịt trước khi nhập.
   */
  it('xếp được cả cột thẻ chưa có hạn — KHÔNG được ném lỗi', () => {
    const ds = [
      goc,
      { ...goc, id: 'b', tieu_de: 'Việc B' },
      { ...goc, id: 'c', tieu_de: 'Việc C', han_hoan_thanh: '2026-09-01' },
    ];
    const xep = sapXepThe(ds, moc);
    expect(xep).toHaveLength(3);
    expect(xep[0].id).toBe('c');   // có hạn thì lên trước
  });

  it('chuanBiQuaLau không đoán bừa khi thiếu mốc', () => {
    expect(chuanBiQuaLau({ ...goc, trang_thai: 'CHUAN_BI' }, moc)).toBe(false);
  });
});

describe('moduleThongBao', () => {
  // Nhãn phân hệ phải trùng nhanPhanHe() của edge function notify-ct2:
  // chuông trong ứng dụng và push trên màn hình khoá không được nói hai đằng.
  it('đọc theo nhãn dòng đầu của thân tin, không theo mã sự kiện', () => {
    expect(moduleThongBao({ ma_su_kien: 'N12', noi_dung: 'Dấu ấn: Chị Lan vừa ghi nhận' })).toBe('Dấu ấn');
    expect(moduleThongBao({ ma_su_kien: 'N12', noi_dung: 'Hành động: cập nhật tiến độ' })).toBe('CT3');
    expect(moduleThongBao({ ma_su_kien: 'NHIP', noi_dung: 'Bằng chứng vừa được nộp' })).toBe('CT2');
  });

  it('tin hạ tầng toàn cổng thì không mang nhãn phân hệ nào', () => {
    expect(moduleThongBao({ ma_su_kien: 'LICH_NGHI', noi_dung: 'Còn 3 ngày tới Quốc khánh' })).toBe('');
  });
});
