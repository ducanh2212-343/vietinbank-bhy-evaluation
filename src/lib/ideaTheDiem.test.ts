import { describe, it, expect } from 'vitest';
import { demLuyKe, diemQuyDoiBenRe, datDieuKienPhong } from './ideaKpi';
import {
  docTongHopTheDiem,
  nhomApCongThuc,
  nhomViTriTuChucDanh,
  tinhDongTheDiem,
  tinhPhongTheDiem,
  tinhTheDiem,
  tomTatTheDiem,
  type CanBoTheDiem,
  type PhongTheDiem,
} from './ideaTheDiem';

const dem = (um: number, br: number, vc: number, lt = 0) => ({ 'Ươm mầm': um, 'Bén rễ': br, 'Vươn cành': vc, 'Lan tỏa': lt });

const phong = (mot: Partial<PhongTheDiem>): PhongTheDiem => ({
  phongId: 'p1', ma: 'KHDN', ten: 'Phòng KHDN', soCanBo: 15, dem: dem(13, 11, 6), ...mot,
});
const canBo = (mot: Partial<CanBoTheDiem>): CanBoTheDiem => ({
  profileId: 'c1', hoTen: 'A', phongId: 'p1', maPhong: 'KHDN', tenPhong: 'Phòng KHDN',
  chucDanh: 'Cán bộ Phòng KHDN', khoanGon: false, dem: dem(0, 0, 0), ...mot,
});

describe('demLuyKe — ghi nhận lũy kế theo chốt 17/09/2026', () => {
  it('10 ý tưởng, 2 Vươn cành, 1 trong đó Lan tỏa → 10 Ươm mầm · 2 Bén rễ · 2 Vươn cành · 1 Lan tỏa', () => {
    // Đếm theo cấp cao nhất: 8 dừng ở Ươm mầm, 0 dừng ở Bén rễ, 1 dừng ở Vươn cành, 1 Lan tỏa
    expect(demLuyKe(dem(8, 0, 1, 1))).toEqual(dem(10, 2, 2, 1));
  });

  it('điểm quy đổi tính trên cấp cao nhất bằng Bén rễ + Vươn cành + Lan tỏa lũy kế', () => {
    const d = dem(2, 2, 1, 0); // Trần Hà Trang
    const lk = demLuyKe(d);
    expect(diemQuyDoiBenRe(d)).toBe(4);
    expect(lk['Bén rễ'] + lk['Vươn cành'] + lk['Lan tỏa']).toBe(4);
  });
});

describe('nhomViTriTuChucDanh — chức danh danh bạ → nhóm Thẻ điểm', () => {
  it('nhận đúng các chức danh đang có trong danh bạ', () => {
    expect(nhomViTriTuChucDanh('Giám đốc')).toBe('ban_giam_doc');
    expect(nhomViTriTuChucDanh('Phó giám đốc phụ trách KHDN')).toBe('ban_giam_doc');
    expect(nhomViTriTuChucDanh('Trưởng phòng KHDN')).toBe('tp_dau_moi');
    expect(nhomViTriTuChucDanh('Trưởng phòng Tổ chức Tổng hợp')).toBe('tp_dau_moi');
    expect(nhomViTriTuChucDanh('Trưởng phòng giao dịch')).toBe('tp_pgd');
    expect(nhomViTriTuChucDanh('Phó phòng KHDN')).toBe('pho_phong');
    expect(nhomViTriTuChucDanh('Phó phòng giao dịch phụ trách quầy')).toBe('pho_phong');
    expect(nhomViTriTuChucDanh('Kiểm soát viên Phòng DVKH')).toBe('pho_phong');
    expect(nhomViTriTuChucDanh('Cán bộ quan hệ khách hàng bán lẻ kiêm KHDN')).toBe('can_bo');
    expect(nhomViTriTuChucDanh('NV Thủ quỹ')).toBe('can_bo');
    expect(nhomViTriTuChucDanh('')).toBe('can_bo');
  });

  it('không phân biệt hoa thường và dạng mã Unicode', () => {
    expect(nhomViTriTuChucDanh('TRƯỞNG PHÒNG GIAO DỊCH')).toBe('tp_pgd');
    expect(nhomViTriTuChucDanh('Phó phòng Bán lẻ'.normalize('NFD'))).toBe('pho_phong');
  });

  it('Phó phòng tạm tính như Trưởng phòng đơn vị: phòng chi nhánh → TP đầu mối, PGD → TP PGD', () => {
    expect(nhomApCongThuc('pho_phong', 'KHDN')).toBe('tp_dau_moi');
    expect(nhomApCongThuc('pho_phong', 'PHONG_GIAO_DICH_VAN_LAM')).toBe('tp_pgd');
    expect(nhomApCongThuc('can_bo', 'KHDN')).toBe('can_bo');
    expect(nhomApCongThuc('tp_pgd', 'PHONG_GIAO_DICH_VAN_LAM')).toBe('tp_pgd');
  });
});

describe('tinhDongTheDiem — số liệu thật 17/09/2026', () => {
  it('Trưởng phòng KHDN: phòng 6 Vươn cành, cá nhân 1 → đạt, 23/15 điểm chạm trần 130%', () => {
    const d = tinhDongTheDiem(canBo({ chucDanh: 'Trưởng phòng KHDN', dem: dem(1, 1, 1) }), phong({}));
    expect(d.nhomApCongThuc).toBe('tp_dau_moi');
    expect(d.chiTieuBenRe).toBe(15);
    expect(d.ketQua.dat).toBe(true);
    expect(d.ketQua.phanTramHoanThanh).toBe(130);
    expect(d.luyKe).toEqual(dem(3, 2, 1));
  });

  it('Phó phòng KHDN có 2 Vươn cành: tính như Trưởng phòng KHDN → đạt', () => {
    const d = tinhDongTheDiem(canBo({ chucDanh: 'Phó phòng KHDN', dem: dem(0, 4, 2) }), phong({}));
    expect(d.nhom).toBe('pho_phong');
    expect(d.nhomApCongThuc).toBe('tp_dau_moi');
    expect(d.ketQua.dat).toBe(true);
    expect(d.diemQuyDoi).toBe(8);
  });

  it('Trưởng PGD Văn Lâm: 8 điểm Bén rễ nhưng phòng chưa có Vươn cành (cần 4) → 0 điểm', () => {
    const pgd = phong({ phongId: 'p2', ma: 'PHONG_GIAO_DICH_VAN_LAM', ten: 'PGD Văn Lâm', soCanBo: 10, dem: dem(25, 8, 0) });
    const d = tinhDongTheDiem(canBo({ phongId: 'p2', maPhong: pgd.ma, chucDanh: 'Trưởng phòng giao dịch', dem: dem(1, 1, 0) }), pgd);
    expect(d.nhomApCongThuc).toBe('tp_pgd');
    expect(d.chiTieuBenRe).toBe(20);
    expect(d.ketQua.dat).toBe(false);
    expect(d.ketQua.phanTramHoanThanh).toBe(0);
    expect(d.ketQua.conThieu.join(' ')).toContain('≥ 4 ý tưởng Vươn cành');
  });

  it('Cán bộ HTTD 6 Ươm mầm + 1 Bén rễ + 2 Vươn cành: đường Bén rễ 5/6, đường Ươm mầm 9/12 → chưa đạt', () => {
    const d = tinhDongTheDiem(canBo({ maPhong: 'HTTD', chucDanh: 'Cán bộ Hỗ trợ tín dụng', dem: dem(6, 1, 2) }), null);
    expect(d.nhomApCongThuc).toBe('can_bo');
    expect(d.chiTieuBenRe).toBeNull();
    expect(d.diemQuyDoi).toBe(5);
    expect(d.luyKe).toEqual(dem(9, 3, 2));
    expect(d.ketQua.dat).toBe(false);
    expect(d.ketQua.phanTramHoanThanh).toBe(83.3);
  });

  it('Ban Giám đốc: chỉ hiện số, không giao chỉ tiêu', () => {
    const d = tinhDongTheDiem(canBo({ maPhong: 'BGD', chucDanh: 'Phó giám đốc phụ trách KHDN', dem: dem(0, 0, 1) }), null);
    expect(d.ketQua.coGiaoChiTieu).toBe(false);
    expect(d.chiTieuBenRe).toBeNull();
  });

  it('cán bộ khoán gọn: không giao chỉ tiêu, ghi rõ lý do', () => {
    const d = tinhDongTheDiem(canBo({ khoanGon: true, dem: dem(3, 0, 0) }), phong({}));
    expect(d.ketQua.coGiaoChiTieu).toBe(false);
    expect(d.ketQua.dienGiai[0]).toContain('khoán gọn');
  });
});

describe('tinhPhongTheDiem — bảng theo phòng', () => {
  it('KHDN 15 cán bộ: chỉ tiêu 15, quy đổi 23 (153%), điều kiện phòng đạt', () => {
    const r = tinhPhongTheDiem(phong({}));
    expect(r.chiTieuBenRe).toBe(15);
    expect(r.diemQuyDoi).toBe(23);
    expect(r.tyLeBenRe).toBe(153.3);
    expect(r.datDieuKienPhong).toBe(true);
    expect(r.luyKe).toEqual(dem(30, 17, 6));
  });

  it('PGD: chỉ tiêu gấp đôi số cán bộ, điều kiện ≥ 4 Vươn cành hoặc ≥ 2 Lan tỏa', () => {
    const r = tinhPhongTheDiem(phong({ ma: 'PHONG_GIAO_DICH_AN_THI', soCanBo: 8, dem: dem(2, 4, 0) }));
    expect(r.nhomTruongPhong).toBe('tp_pgd');
    expect(r.chiTieuBenRe).toBe(16);
    expect(r.datDieuKienPhong).toBe(false);
    expect(r.moTaDieuKienPhong).toBe('≥ 4 Vươn cành hoặc ≥ 2 Lan tỏa');
  });

  it('Ban Giám đốc không có Trưởng phòng → không giao', () => {
    const r = tinhPhongTheDiem(phong({ ma: 'BGD', soCanBo: 4, dem: dem(3, 0, 1) }));
    expect(r.nhomTruongPhong).toBeNull();
    expect(r.chiTieuBenRe).toBeNull();
    expect(r.datDieuKienPhong).toBeNull();
  });

  it('datDieuKienPhong: 1 Lan tỏa đủ cho phòng đầu mối, chưa đủ cho PGD', () => {
    expect(datDieuKienPhong('tp_dau_moi', dem(0, 0, 0, 1))).toBe(true);
    expect(datDieuKienPhong('tp_pgd', dem(0, 0, 0, 1))).toBe(false);
    expect(datDieuKienPhong('can_bo', dem(0, 0, 0, 0))).toBe(true);
  });
});

describe('docTongHopTheDiem + tinhTheDiem + tomTatTheDiem', () => {
  const json = {
    tinh_luc: '2026-09-17T09:00:00Z',
    dang_ap_kpi: false,
    phong: [
      { phong_id: 'p1', ma: 'KHDN', ten: 'Phòng KHDN', so_cb: 15, um: 13, br: 11, vc: 6, lt: 0 },
      { phong_id: 'p2', ma: 'BGD', ten: 'Ban Giám đốc', so_cb: 4, um: 3, br: 0, vc: 1, lt: 0 },
    ],
    can_bo: [
      { profile_id: 'a', ho_ten: 'Đỗ Việt Anh', phong_id: 'p1', ma_phong: 'KHDN', ten_phong: 'Phòng KHDN', chuc_danh: 'Trưởng phòng KHDN', khoan_gon: false, um: 1, br: 1, vc: 1, lt: 0 },
      { profile_id: 'b', ho_ten: 'Ngô Thị Nhung', phong_id: 'p1', ma_phong: 'KHDN', ten_phong: 'Phòng KHDN', chuc_danh: 'Cán bộ Phòng KHDN', khoan_gon: false, um: 1, br: 0, vc: 2, lt: 0 },
      { profile_id: 'c', ho_ten: 'Chưa có', phong_id: 'p1', ma_phong: 'KHDN', ten_phong: 'Phòng KHDN', chuc_danh: 'Cán bộ Phòng KHDN', khoan_gon: false, um: 0, br: 0, vc: 0, lt: 0 },
      { profile_id: 'd', ho_ten: 'Nguyễn Đức Thái Hoàng', phong_id: 'p2', ma_phong: 'BGD', ten_phong: 'Ban Giám đốc', chuc_danh: 'Phó giám đốc phụ trách KHDN', khoan_gon: false, um: 0, br: 0, vc: 1, lt: 0 },
    ],
  };

  it('đọc jsonb có phòng hờ và tính đủ dòng', () => {
    const th = docTongHopTheDiem(json);
    expect(th.phong).toHaveLength(2);
    expect(th.canBo[0].dem).toEqual(dem(1, 1, 1));
    expect(docTongHopTheDiem(null).canBo).toEqual([]);
    expect(docTongHopTheDiem({ phong: 'x', can_bo: [null, 5] }).canBo).toEqual([]);
  });

  it('xếp người được giao chỉ tiêu trước, %HT cao trước; Ban Giám đốc xuống cuối', () => {
    const dong = tinhTheDiem(docTongHopTheDiem(json));
    expect(dong.map(d => d.canBo.hoTen)).toEqual(['Đỗ Việt Anh', 'Ngô Thị Nhung', 'Chưa có', 'Nguyễn Đức Thái Hoàng']);
  });

  it('tóm tắt: tổng ý tưởng cộng theo phòng để không đếm trùng đồng đề xuất', () => {
    const th = docTongHopTheDiem(json);
    const tt = tomTatTheDiem(tinhTheDiem(th), th.phong);
    expect(tt).toEqual({ soCanBo: 4, soCoYTuong: 3, soDuocGiao: 3, soDat: 1, tongYTuong: 34 });
  });
});
