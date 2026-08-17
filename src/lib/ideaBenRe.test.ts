import { describe, it, expect } from 'vitest';
import {
  CAU_HOI_BEN_RE,
  DIEM_TOI_DA_BEN_RE,
  MUC_DIEM_BEN_RE,
  NGUONG_CAN_NHAC,
  NGUONG_NEN_TRINH,
  chamPhieuBenRe,
  docPhieuBenRe,
  goiPhieuBenRe,
  phieuCoNoiDung,
  type PhieuBenRe,
} from './ideaBenRe';

const day = (o: Partial<PhieuBenRe>): PhieuBenRe => ({ d1: 2, d2: 2, d3: 2, d4: 2, d5: 2, ...o });

describe('Bộ câu hỏi Bén rễ — thang phải THẤP HƠN Hội đồng', () => {
  it('5 câu, thang 0–2, tối đa 10 điểm', () => {
    expect(CAU_HOI_BEN_RE).toHaveLength(5);
    expect(MUC_DIEM_BEN_RE.map(m => m.diem)).toEqual([0, 1, 2]);
    expect(DIEM_TOI_DA_BEN_RE).toBe(10);
  });

  it('ngưỡng nên trình là 60% — thấp hơn ngưỡng 70% (3,5/5) của Vươn cành', () => {
    expect(NGUONG_NEN_TRINH / DIEM_TOI_DA_BEN_RE).toBe(0.6);
    expect(NGUONG_NEN_TRINH / DIEM_TOI_DA_BEN_RE).toBeLessThan(3.5 / 5);
  });

  it('có đúng MỘT câu điều kiện chặn, là câu rủi ro', () => {
    const chan = CAU_HOI_BEN_RE.filter(c => c.laDieuKienChan);
    expect(chan).toHaveLength(1);
    expect(chan[0].ma).toBe('d4');
  });

  it('mọi câu đều có tiêu đề và mô tả tiếng Việt', () => {
    for (const c of CAU_HOI_BEN_RE) {
      expect(c.tieuDe.length).toBeGreaterThan(3);
      expect(c.moTa.length).toBeGreaterThan(10);
    }
  });
});

describe('chamPhieuBenRe — kết luận gợi ý', () => {
  it('chấm tối đa → nên trình', () => {
    const kq = chamPhieuBenRe(day({}));
    expect(kq.tongDiem).toBe(10);
    expect(kq.ketLuan).toBe('nen_trinh');
    expect(kq.daChamDu).toBe(true);
  });

  it('đúng ngưỡng 6 điểm → nên trình', () => {
    const kq = chamPhieuBenRe({ d1: 2, d2: 1, d3: 1, d4: 1, d5: 1 });
    expect(kq.tongDiem).toBe(6);
    expect(kq.ketLuan).toBe('nen_trinh');
  });

  it('5 điểm → cân nhắc, chưa tới ngưỡng trình', () => {
    const kq = chamPhieuBenRe({ d1: 1, d2: 1, d3: 1, d4: 1, d5: 1 });
    expect(kq.tongDiem).toBe(5);
    expect(kq.ketLuan).toBe('can_nhac');
  });

  it('dưới 4 điểm → chưa nên trình', () => {
    expect(chamPhieuBenRe({ d1: 1, d2: 1, d3: 1, d4: 0, d5: 0 }).ketLuan).toBe('chua_nen');
    expect(NGUONG_CAN_NHAC).toBe(4);
  });

  it('rủi ro chấm 0 thì chưa nên trình DÙ tổng điểm tối đa ở các câu khác', () => {
    const kq = chamPhieuBenRe(day({ d4: 0 }));
    expect(kq.tongDiem).toBe(8); // vẫn cao
    expect(kq.vuongDieuKienChan).toBe(true);
    expect(kq.ketLuan).toBe('chua_nen');
    expect(kq.dienGiai).toContain('không bù bằng điểm các câu khác');
  });

  it('rủi ro chấm 1 (một phần) thì không vướng điều kiện chặn', () => {
    const kq = chamPhieuBenRe(day({ d4: 1 }));
    expect(kq.vuongDieuKienChan).toBe(false);
    expect(kq.ketLuan).toBe('nen_trinh');
  });

  it('phiếu chấm dở: tính phần đã chấm, KHÔNG coi câu trống là 0 điểm', () => {
    const kq = chamPhieuBenRe({ d1: 2, d2: 2 });
    expect(kq.soCauDaCham).toBe(2);
    expect(kq.daChamDu).toBe(false);
    expect(kq.tongDiem).toBe(4);
    expect(kq.dienGiai).toContain('mới chấm 2/5 câu');
    // Câu chặn chưa chấm thì chưa vướng
    expect(kq.vuongDieuKienChan).toBe(false);
  });

  it('phiếu rỗng → chưa nên trình, không vỡ', () => {
    const kq = chamPhieuBenRe({});
    expect(kq.tongDiem).toBe(0);
    expect(kq.soCauDaCham).toBe(0);
    expect(kq.ketLuan).toBe('chua_nen');
  });

  it('điểm ngoài thang bị kẹp về 0–2, không thổi phồng kết luận', () => {
    const kq = chamPhieuBenRe({ d1: 99, d2: -5, d3: 2, d4: 2, d5: 2 });
    expect(kq.tongDiem).toBe(8); // 2 + 0 + 2 + 2 + 2
  });
});

describe('Đọc và gói phiếu qua CSDL', () => {
  it('gói dùng khóa snake_case cho ghi chú', () => {
    const goi = goiPhieuBenRe({ d1: 2, d4: 1, ghiChu: '  đã trao đổi với TP  ' });
    expect(goi).toEqual({ d1: 2, d4: 1, ghi_chu: 'đã trao đổi với TP' });
  });

  it('đọc lại đúng phiếu đã gói — đi vòng không mất dữ liệu', () => {
    const goc: PhieuBenRe = { d1: 2, d2: 1, d3: 0, d4: 2, d5: 1, ghiChu: 'ghi chú' };
    expect(docPhieuBenRe(goiPhieuBenRe(goc))).toEqual(goc);
  });

  it('dữ liệu hỏng hoặc null → phiếu rỗng, không ném lỗi', () => {
    expect(docPhieuBenRe(null)).toEqual({});
    expect(docPhieuBenRe('hong')).toEqual({});
    expect(docPhieuBenRe({ d1: 'hai', xyz: 9 })).toEqual({});
  });

  it('nhận cả khóa ghiChu lẫn ghi_chu', () => {
    expect(docPhieuBenRe({ ghi_chu: 'a' }).ghiChu).toBe('a');
    expect(docPhieuBenRe({ ghiChu: 'b' }).ghiChu).toBe('b');
  });

  it('phieuCoNoiDung phân biệt phiếu trống với phiếu chỉ có ghi chú', () => {
    expect(phieuCoNoiDung(null)).toBe(false);
    expect(phieuCoNoiDung({})).toBe(false);
    expect(phieuCoNoiDung({ ghiChu: '   ' })).toBe(false);
    expect(phieuCoNoiDung({ ghiChu: 'có ý kiến' })).toBe(true);
    expect(phieuCoNoiDung({ d3: 0 })).toBe(true); // chấm 0 vẫn là đã chấm
  });
});
