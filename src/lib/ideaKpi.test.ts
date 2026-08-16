import { describe, it, expect } from 'vitest';
import {
  CHI_TIEU_CAN_BO_BEN_RE,
  CHI_TIEU_CAN_BO_UOM_MAM,
  HE_SO_QUY_DOI_BEN_RE,
  NGUONG_BEN_RE,
  PHAN_TRAM_TOI_DA,
  TRONG_SO_DMST,
  TRONG_SO_DMST_KHOI_BACK,
  chiTieuBenRe,
  demRong,
  diemKpiTheoTrongSo,
  diemQuyDoiBenRe,
  kiemTraDieuKienCan,
  kpiCanBo,
  kpiLanhDao,
  type DemTheoCap,
} from './ideaKpi';

const dem = (o: Partial<DemTheoCap>): DemTheoCap => ({ ...demRong(), ...o });

describe('Hằng số phải khớp NGUYÊN VĂN Thẻ điểm 25/06/2026', () => {
  it('hệ số quy đổi: 1 Vươn cành = 2 Bén rễ, 1 Lan tỏa = 3 Bén rễ', () => {
    expect(HE_SO_QUY_DOI_BEN_RE['Bén rễ']).toBe(1);
    expect(HE_SO_QUY_DOI_BEN_RE['Vươn cành']).toBe(2);
    expect(HE_SO_QUY_DOI_BEN_RE['Lan tỏa']).toBe(3);
    // Văn bản KHÔNG cho Ươm mầm quy đổi sang Bén rễ
    expect(HE_SO_QUY_DOI_BEN_RE['Ươm mầm']).toBe(0);
  });

  it('chỉ tiêu cán bộ 12 Ươm mầm hoặc 6 Bén rễ; trần 130%; ngưỡng 90%', () => {
    expect(CHI_TIEU_CAN_BO_UOM_MAM).toBe(12);
    expect(CHI_TIEU_CAN_BO_BEN_RE).toBe(6);
    expect(PHAN_TRAM_TOI_DA).toBe(130);
    expect(NGUONG_BEN_RE).toBe(0.9);
  });

  it('trọng số: TP đầu mối 20 · TP PGD 30 · Phó phòng 30 · cán bộ 20 · TCTH 5 · HTTD 10', () => {
    expect(TRONG_SO_DMST.tp_dau_moi).toBe(20);
    expect(TRONG_SO_DMST.tp_pgd).toBe(30);
    expect(TRONG_SO_DMST.pho_phong).toBe(30);
    expect(TRONG_SO_DMST.can_bo).toBe(20);
    expect(TRONG_SO_DMST_KHOI_BACK.tcth).toBe(5);
    expect(TRONG_SO_DMST_KHOI_BACK.httd).toBe(10);
  });

  it('Ban Giám đốc KHÔNG được giao chỉ tiêu ĐMST', () => {
    expect(TRONG_SO_DMST.ban_giam_doc).toBeNull();
    const kq = kpiLanhDao('ban_giam_doc', { demPhong: demRong(), demBanThan: demRong(), soCanBo: 4 });
    expect(kq.coGiaoChiTieu).toBe(false);
    expect(diemKpiTheoTrongSo(kq)).toBe(0);
  });
});

describe('kpiCanBo — 12 Ươm mầm HOẶC 6 Bén rễ (có quy đổi)', () => {
  it('đủ 12 ý tưởng Ươm mầm → đạt 100%', () => {
    const kq = kpiCanBo(dem({ 'Ươm mầm': 12 }));
    expect(kq.dat).toBe(true);
    expect(kq.phanTramHoanThanh).toBe(100);
  });

  it('11 Ươm mầm và không có gì khác → chưa đạt', () => {
    const kq = kpiCanBo(dem({ 'Ươm mầm': 11 }));
    expect(kq.dat).toBe(false);
    expect(kq.conThieu[0]).toContain('1 ý tưởng Ươm mầm');
  });

  it('6 Bén rễ → đạt qua đường Bén rễ dù chưa đủ 12 ý tưởng', () => {
    const kq = kpiCanBo(dem({ 'Bén rễ': 6 }));
    expect(kq.dat).toBe(true);
    expect(kq.phanTramHoanThanh).toBe(100);
  });

  it('3 Vươn cành = 6 điểm Bén rễ → đạt', () => {
    expect(diemQuyDoiBenRe(dem({ 'Vươn cành': 3 }))).toBe(6);
    expect(kpiCanBo(dem({ 'Vươn cành': 3 })).dat).toBe(true);
  });

  it('2 Lan tỏa = 6 điểm Bén rễ → đạt', () => {
    expect(diemQuyDoiBenRe(dem({ 'Lan tỏa': 2 }))).toBe(6);
    expect(kpiCanBo(dem({ 'Lan tỏa': 2 })).dat).toBe(true);
  });

  it('hỗn hợp 1 Lan tỏa + 1 Vươn cành + 1 Bén rễ = 3+2+1 = 6 → đạt', () => {
    const d = dem({ 'Lan tỏa': 1, 'Vươn cành': 1, 'Bén rễ': 1 });
    expect(diemQuyDoiBenRe(d)).toBe(6);
    expect(kpiCanBo(d).dat).toBe(true);
  });

  it('Ươm mầm KHÔNG quy đổi sang Bén rễ: 20 Ươm mầm vẫn 0 điểm đường Bén rễ', () => {
    expect(diemQuyDoiBenRe(dem({ 'Ươm mầm': 20 }))).toBe(0);
  });

  it('%HT chặn trần 130% dù vượt xa chỉ tiêu', () => {
    expect(kpiCanBo(dem({ 'Bén rễ': 30 })).phanTramHoanThanh).toBe(130);
    expect(kpiCanBo(dem({ 'Ươm mầm': 100 })).phanTramHoanThanh).toBe(130);
  });

  it('lấy đường có %HT cao hơn', () => {
    // 6 Bén rễ: đường Ươm mầm 6/12 = 50%, đường Bén rễ 6/6 = 100% → lấy 100
    expect(kpiCanBo(dem({ 'Bén rễ': 6 })).phanTramHoanThanh).toBe(100);
  });

  it('điểm quy về trọng số 20: %HT 130 → 26 điểm', () => {
    const kq = kpiCanBo(dem({ 'Bén rễ': 30 }));
    expect(diemKpiTheoTrongSo(kq)).toBe(26);
  });

  it('cán bộ khối back dùng trọng số riêng: TCTH 5, HTTD 10', () => {
    const kq = kpiCanBo(dem({ 'Bén rễ': 6 })); // 100%
    expect(diemKpiTheoTrongSo(kq, TRONG_SO_DMST_KHOI_BACK.tcth)).toBe(5);
    expect(diemKpiTheoTrongSo(kq, TRONG_SO_DMST_KHOI_BACK.httd)).toBe(10);
  });
});

describe('chiTieuBenRe — mẫu số theo nhóm vị trí', () => {
  it('TP đầu mối: bằng số cán bộ của Phòng', () => {
    expect(chiTieuBenRe('tp_dau_moi', 15)).toBe(15);
  });
  it('TP Phòng giao dịch: bằng 2 LẦN số cán bộ', () => {
    expect(chiTieuBenRe('tp_pgd', 10)).toBe(20);
  });
  it('Phó phòng: bằng số cán bộ phụ trách (cả bản thân)', () => {
    expect(chiTieuBenRe('pho_phong', 5)).toBe(5);
  });
});

describe('kiemTraDieuKienCan — điều kiện cần theo văn bản', () => {
  it('TP đầu mối: phòng ≥2 Vươn cành HOẶC ≥1 Lan tỏa, và bản thân ≥1', () => {
    const du = kiemTraDieuKienCan('tp_dau_moi', {
      demPhong: dem({ 'Vươn cành': 2 }), demBanThan: dem({ 'Vươn cành': 1 }), soCanBo: 15,
    });
    expect(du).toEqual([]);

    // 1 Lan tỏa cũng thỏa vế phòng
    expect(kiemTraDieuKienCan('tp_dau_moi', {
      demPhong: dem({ 'Lan tỏa': 1 }), demBanThan: dem({ 'Lan tỏa': 1 }), soCanBo: 15,
    })).toEqual([]);
  });

  it('TP đầu mối: phòng đủ nhưng bản thân TP chưa có → vẫn thiếu', () => {
    const thieu = kiemTraDieuKienCan('tp_dau_moi', {
      demPhong: dem({ 'Vươn cành': 3 }), demBanThan: demRong(), soCanBo: 15,
    });
    expect(thieu).toHaveLength(1);
    expect(thieu[0]).toContain('Cá nhân Trưởng phòng');
  });

  it('TP PGD cần ≥4 Vươn cành HOẶC ≥2 Lan tỏa — 3 Vươn cành là chưa đủ', () => {
    const thieu = kiemTraDieuKienCan('tp_pgd', {
      demPhong: dem({ 'Vươn cành': 3 }), demBanThan: dem({ 'Vươn cành': 1 }), soCanBo: 10,
    });
    expect(thieu[0]).toContain('≥ 4 ý tưởng Vươn cành');

    expect(kiemTraDieuKienCan('tp_pgd', {
      demPhong: dem({ 'Lan tỏa': 2 }), demBanThan: dem({ 'Lan tỏa': 1 }), soCanBo: 10,
    })).toEqual([]);
  });

  it('Phó phòng chỉ cần bản thân ≥1 Vươn cành/Lan tỏa', () => {
    expect(kiemTraDieuKienCan('pho_phong', {
      demPhong: demRong(), demBanThan: dem({ 'Vươn cành': 1 }), soCanBo: 5,
    })).toEqual([]);
    expect(kiemTraDieuKienCan('pho_phong', {
      demPhong: dem({ 'Vươn cành': 9 }), demBanThan: demRong(), soCanBo: 5,
    })).toHaveLength(1);
  });
});

describe('kpiLanhDao — dưới ngưỡng quy 0 điểm (không tính theo tỷ lệ)', () => {
  it('TP đầu mối 15 CB: đủ điều kiện cần + 14/15 Bén rễ (93%) → đạt', () => {
    const kq = kpiLanhDao('tp_dau_moi', {
      demPhong: dem({ 'Bén rễ': 12, 'Vươn cành': 2 }), // 14 ý tưởng từ Bén rễ trở lên
      demBanThan: dem({ 'Vươn cành': 1 }),
      soCanBo: 15,
    });
    expect(kq.dat).toBe(true);
    expect(kq.phanTramHoanThanh).toBeCloseTo(93.3, 1);
  });

  it('Bén rễ 13/15 = 86,7% < 90% → 0 điểm dù điều kiện cần đã đạt', () => {
    const kq = kpiLanhDao('tp_dau_moi', {
      demPhong: dem({ 'Bén rễ': 11, 'Vươn cành': 2 }),
      demBanThan: dem({ 'Vươn cành': 1 }),
      soCanBo: 15,
    });
    expect(kq.dat).toBe(false);
    expect(kq.phanTramHoanThanh).toBe(0);
    expect(kq.conThieu.join(' ')).toContain('cần tối thiểu 14');
  });

  it('Bén rễ dư dả nhưng thiếu điều kiện cần → vẫn 0 điểm', () => {
    const kq = kpiLanhDao('tp_dau_moi', {
      demPhong: dem({ 'Bén rễ': 30 }),
      demBanThan: demRong(),
      soCanBo: 15,
    });
    expect(kq.dat).toBe(false);
    expect(kq.phanTramHoanThanh).toBe(0);
  });

  it('TP PGD 10 CB → chỉ tiêu 20 Bén rễ, đạt 20 và đủ điều kiện → 100%', () => {
    const kq = kpiLanhDao('tp_pgd', {
      demPhong: dem({ 'Bén rễ': 16, 'Vươn cành': 4 }),
      demBanThan: dem({ 'Vươn cành': 1 }),
      soCanBo: 10,
    });
    expect(kq.dat).toBe(true);
    expect(kq.phanTramHoanThanh).toBe(100);
    expect(diemKpiTheoTrongSo(kq)).toBe(30);
  });

  it('%HT lãnh đạo cũng chặn trần 130%', () => {
    const kq = kpiLanhDao('pho_phong', {
      demPhong: dem({ 'Bén rễ': 50, 'Vươn cành': 1 }),
      demBanThan: dem({ 'Vươn cành': 1 }),
      soCanBo: 5,
    });
    expect(kq.phanTramHoanThanh).toBe(130);
    expect(diemKpiTheoTrongSo(kq)).toBe(39); // trọng số 30 × 130%
  });

  it('ý tưởng đã lên Vươn cành/Lan tỏa được tính là đã qua Bén rễ', () => {
    const kq = kpiLanhDao('pho_phong', {
      demPhong: dem({ 'Lan tỏa': 5 }),
      demBanThan: dem({ 'Lan tỏa': 1 }),
      soCanBo: 5,
    });
    expect(kq.dat).toBe(true);
    expect(kq.phanTramHoanThanh).toBe(100);
  });
});
