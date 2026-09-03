import { describe, it, expect } from 'vitest';
import { tongHopSoGhiNhan, tongHopTheoPhong, TEN_NGUON } from '../soGhiNhanExcel';
import type { DongSoGhiNhan } from '../useBenRe';

const dong = (mot: Partial<DongSoGhiNhan>): DongSoGhiNhan => ({
  ideaId: 'x', title: 'Ý tưởng', proposer: 'A', phong: 'Phòng KHDN', coDemo: false, capDeXuat: 'Nội bộ CN',
  linhVuc: null, developmentLevel: 'Bén rễ', capDo: 'Bén rễ', trangThai: 'da_ghi_nhan', nguonCongNhan: 'giam_doc',
  duyetCn: true, duyetTsc: false, ghiNhanKpi: true, mucThuong: 300000, lyDoThuong: 'trong_han_muc', tuanChon: null,
  nguoiDuyet: null, duyetLuc: null, nguoiGhiNhan: null, ghiNhanLuc: null, smpMa: null, smpTrangThai: null,
  diemTcth: null, diemGd: null, yKienGd: null, ghiChu: null, traVeBoi: null, lyDoTraVe: null, soLanBoSung: 0,
  lyDoKetLuan: null, lyDoThuHoi: null, createdAt: '2026-08-01T00:00:00Z', ...mot,
});

describe('Kết xuất sổ ghi nhận — tổng hợp theo cấp × nguồn', () => {
  it('tách Bén rễ do Giám đốc CN duyệt với Bén rễ do TSC đồng ý — đúng câu Giám đốc hỏi', () => {
    const rows = [
      dong({ nguonCongNhan: 'giam_doc' }), dong({ nguonCongNhan: 'giam_doc' }),
      dong({ nguonCongNhan: 'tsc', duyetCn: false, duyetTsc: true }),
      dong({ capDo: 'Ươm mầm', nguonCongNhan: 'chi_nhanh', mucThuong: 100000 }),
    ];
    const th = tongHopSoGhiNhan(rows);
    expect(th.map(d => `${d.capDo}|${d.nguon}|${d.soYTuong}|${d.tongTien}`)).toEqual([
      `Ươm mầm|${TEN_NGUON.chi_nhanh}|1|100000`,
      `Bén rễ|${TEN_NGUON.giam_doc}|2|600000`,
      `Bén rễ|${TEN_NGUON.tsc}|1|300000`,
    ]);
  });

  it('dòng chưa công nhận (chờ GĐ, trả về, dừng…) KHÔNG lọt vào bảng tổng hợp', () => {
    const rows = [dong({ trangThai: 'cho_gd_duyet', nguonCongNhan: '', mucThuong: 0 }), dong({ trangThai: 'dung', nguonCongNhan: '', mucThuong: 0 })];
    expect(tongHopSoGhiNhan(rows)).toEqual([]);
  });

  it('đếm KPI riêng với đếm ý tưởng — tiền và KPI là hai trục', () => {
    const rows = [dong({ ghiNhanKpi: true }), dong({ ghiNhanKpi: false, mucThuong: 300000 })];
    const [d] = tongHopSoGhiNhan(rows);
    expect(d.soYTuong).toBe(2);
    expect(d.tinhKpi).toBe(1);
    expect(d.tongTien).toBe(600000);
  });

  it('theo phòng: cộng đúng cấp và tiền, chỉ dòng đã công nhận', () => {
    const rows = [
      dong({ phong: 'PGD Văn Lâm' }), dong({ phong: 'PGD Văn Lâm', capDo: 'Ươm mầm', mucThuong: 100000 }),
      dong({ phong: 'Phòng KHDN', trangThai: 'tra_ve', mucThuong: 0 }),
    ];
    const th = tongHopTheoPhong(rows);
    expect(th).toHaveLength(1);
    expect(th[0]).toMatchObject({ phong: 'PGD Văn Lâm', theoCap: { 'Bén rễ': 1, 'Ươm mầm': 1 }, tien: 400000 });
  });
});
