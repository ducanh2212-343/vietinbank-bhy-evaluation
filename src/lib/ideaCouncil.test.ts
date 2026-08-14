import { describe, it, expect } from 'vitest';
import {
  canGopY,
  datTyLe2Phan3,
  docTongHopRpc,
  goiYMaYTuong,
  ketLuanDeXuat,
  loiPhieu,
  tongHopPhieu,
  xetLanToa,
  xetVuonCanh,
  type PhieuCham,
  type TieuChiKey,
} from './ideaCouncil';

// Phiếu mẫu — điểm đều 4, đồng ý Vươn cành; override phần cần cho từng ca
const phieu = (overrides: Partial<PhieuCham> & { diemChung?: number } = {}): PhieuCham => {
  const d = overrides.diemChung ?? 4;
  return {
    diem: { problem: d, impact: d, feasible: d, safety: d, scale: d, ...(overrides.diem ?? {}) },
    deXuat: overrides.deXuat ?? 'vuon_canh',
    thamKhao: overrides.thamKhao ?? false,
  };
};

describe('tongHopPhieu — tổng hợp đúng cột Phụ lục 07', () => {
  it('không phiếu → mọi điểm null, đếm 0', () => {
    const t = tongHopPhieu([]);
    expect(t.soPhieuHopLe).toBe(0);
    expect(t.diemTbChung).toBeNull();
    expect(t.diemTieuChi.safety).toBeNull();
    expect(t.soDongYVuonCanh).toBe(0);
  });

  it('phiếu tham khảo bị loại khỏi điểm TB và tỷ lệ đồng ý', () => {
    const t = tongHopPhieu([
      phieu({ diemChung: 5, deXuat: 'lan_toa' }),
      phieu({ diemChung: 1, deXuat: 'lan_toa', thamKhao: true }), // cùng phòng đề xuất
    ]);
    expect(t.soPhieu).toBe(2);
    expect(t.soPhieuHopLe).toBe(1);
    expect(t.soPhieuThamKhao).toBe(1);
    expect(t.diemTbChung).toBe(5);
    expect(t.soDongYLanToa).toBe(1);
  });

  it('điểm TB chung = TB 5 tiêu chí; đồng ý Vươn cành gồm cả phiếu Lan tỏa', () => {
    const t = tongHopPhieu([
      phieu({ diem: { problem: 5, impact: 4, feasible: 4, safety: 3, scale: 4 }, deXuat: 'vuon_canh' }),
      phieu({ diem: { problem: 3, impact: 4, feasible: 4, safety: 5, scale: 4 }, deXuat: 'lan_toa' }),
      phieu({ diemChung: 2, deXuat: 'khong_xet' }),
    ]);
    expect(t.diemTieuChi.problem).toBeCloseTo((5 + 3 + 2) / 3, 10);
    // TB chung = trung bình 5 điểm TB tiêu chí
    const tb = (['problem', 'impact', 'feasible', 'safety', 'scale'] as TieuChiKey[])
      .map(k => t.diemTieuChi[k]!)
      .reduce((a, b) => a + b, 0) / 5;
    expect(t.diemTbChung).toBeCloseTo(tb, 10);
    expect(t.soDongYVuonCanh).toBe(2); // 1 vuon_canh + 1 lan_toa
    expect(t.soDongYLanToa).toBe(1);
    expect(t.deXuatDem.khong_xet).toBe(1);
  });
});

describe('datTyLe2Phan3 — so sánh nguyên, không trượt biên số thực', () => {
  it('2/3 phiếu đúng biên là ĐẠT', () => {
    expect(datTyLe2Phan3(2, 3)).toBe(true);
  });
  it('3/5 chưa đạt (3×3=9 < 5×2=10)', () => {
    expect(datTyLe2Phan3(3, 5)).toBe(false);
  });
  it('0 phiếu hợp lệ thì không đạt', () => {
    expect(datTyLe2Phan3(0, 0)).toBe(false);
  });
});

describe('xetVuonCanh — ngưỡng mục VI.3', () => {
  it('TB 3,5 · an toàn 3 · 2/3 đồng ý đúng biên → đạt', () => {
    const t = tongHopPhieu([
      phieu({ diem: { problem: 4, impact: 4, feasible: 4, safety: 3, scale: 3 }, deXuat: 'vuon_canh' }), // TB 3.6
      phieu({ diem: { problem: 4, impact: 3, feasible: 4, safety: 3, scale: 3 }, deXuat: 'lan_toa' }),   // TB 3.4
      phieu({ diemChung: 3, deXuat: 'khong_xet' }),
    ]);
    // TB chung = (3.6 + 3.4 + 3)/3 ≈ 3.33 → chưa đạt vì TB
    expect(xetVuonCanh(t).dat).toBe(false);
    expect(xetVuonCanh(t).lyDo.join(' ')).toContain('Điểm TB chung');
  });

  it('đủ cả ba điều kiện → đạt, không còn lý do', () => {
    const t = tongHopPhieu([
      phieu({ diemChung: 4, deXuat: 'vuon_canh' }),
      phieu({ diemChung: 3, deXuat: 'vuon_canh' }),
      phieu({ diemChung: 4, deXuat: 'khong_xet' }),
    ]);
    // TB 3.67 ≥ 3.5, an toàn 3.67 ≥ 3, đồng ý 2/3
    const kq = xetVuonCanh(t);
    expect(kq.dat).toBe(true);
    expect(kq.lyDo).toEqual([]);
  });

  it('an toàn/rủi ro dưới 3 chặn dù điểm chung cao', () => {
    const t = tongHopPhieu([
      phieu({ diem: { problem: 5, impact: 5, feasible: 5, safety: 2, scale: 5 }, deXuat: 'vuon_canh' }),
    ]);
    const kq = xetVuonCanh(t);
    expect(kq.dat).toBe(false);
    expect(kq.lyDo.join(' ')).toContain('An toàn/rủi ro');
  });
});

describe('xetLanToa — thêm điều kiện nhân rộng ≥ 4 và đồng ý Lan tỏa 2/3', () => {
  it('đạt khi TB 4, nhân rộng 4, an toàn 3, cả hội đồng đồng ý Lan tỏa', () => {
    const t = tongHopPhieu([
      phieu({ diem: { problem: 4, impact: 4, feasible: 5, safety: 3, scale: 4 }, deXuat: 'lan_toa' }),
      phieu({ diem: { problem: 4, impact: 4, feasible: 5, safety: 3, scale: 4 }, deXuat: 'lan_toa' }),
    ]);
    expect(xetLanToa(t).dat).toBe(true);
  });

  it('đồng ý Vươn cành không tính vào tỷ lệ đồng ý Lan tỏa', () => {
    const t = tongHopPhieu([
      phieu({ diemChung: 5, deXuat: 'lan_toa' }),
      phieu({ diemChung: 5, deXuat: 'vuon_canh' }),
      phieu({ diemChung: 5, deXuat: 'vuon_canh' }),
    ]);
    const kq = xetLanToa(t);
    expect(kq.dat).toBe(false);
    expect(kq.lyDo.join(' ')).toContain('1/3');
  });

  it('nhân rộng dưới 4 chặn Lan tỏa', () => {
    const t = tongHopPhieu([
      phieu({ diem: { problem: 5, impact: 5, feasible: 5, safety: 5, scale: 3 }, deXuat: 'lan_toa' }),
    ]);
    const kq = xetLanToa(t);
    expect(kq.dat).toBe(false);
    expect(kq.lyDo.join(' ')).toContain('Nhân rộng');
  });
});

describe('ketLuanDeXuat — gợi ý theo tầng TCTH trình', () => {
  const phieuLanToaDat = [
    phieu({ diem: { problem: 5, impact: 4, feasible: 4, safety: 4, scale: 4 }, deXuat: 'lan_toa' }),
    phieu({ diem: { problem: 4, impact: 4, feasible: 5, safety: 4, scale: 5 }, deXuat: 'lan_toa' }),
    phieu({ diem: { problem: 4, impact: 4, feasible: 4, safety: 4, scale: 4 }, deXuat: 'lan_toa' }),
  ];

  it('trình Lan tỏa và đạt Lan tỏa → kết luận Lan tỏa', () => {
    const kq = ketLuanDeXuat(tongHopPhieu(phieuLanToaDat), 'Lan tỏa');
    expect(kq.tang).toBe('Lan tỏa');
  });

  it('trình Vươn cành thì không gợi ý vượt lên Lan tỏa dù điểm đạt', () => {
    const kq = ketLuanDeXuat(tongHopPhieu(phieuLanToaDat), 'Vươn cành');
    expect(kq.tang).toBe('Vươn cành');
  });

  it('trình Lan tỏa nhưng chỉ đạt ngưỡng Vươn cành → hạ về Vươn cành', () => {
    const t = tongHopPhieu([
      phieu({ diemChung: 4, deXuat: 'vuon_canh' }),
      phieu({ diemChung: 3, deXuat: 'vuon_canh' }),
    ]);
    const kq = ketLuanDeXuat(t, 'Lan tỏa');
    expect(kq.tang).toBe('Vươn cành');
  });

  it('không phiếu hợp lệ → chưa kết luận, nêu lý do', () => {
    const kq = ketLuanDeXuat(tongHopPhieu([phieu({ thamKhao: true })]), 'Vươn cành');
    expect(kq.tang).toBeNull();
    expect(kq.nhan).toContain('Chưa có phiếu');
  });
});

describe('loiPhieu — kiểm tra phiếu theo Phụ lục 06', () => {
  it('phiếu đủ thông tin → không lỗi', () => {
    expect(loiPhieu({
      xungDot: 'khong',
      diem: { problem: 4, impact: 4, feasible: 4, safety: 4, scale: 4 },
      deXuat: 'vuon_canh',
      gopY: '',
    })).toEqual([]);
  });

  it('thiếu điểm một tiêu chí → báo đúng mã tiêu chí', () => {
    const loi = loiPhieu({
      xungDot: 'khong',
      diem: { problem: 4, impact: 4, feasible: 4, scale: 4 },
      deXuat: 'vuon_canh',
      gopY: '',
    });
    expect(loi).toHaveLength(1);
    expect(loi[0]).toContain('C4');
  });

  it('D1 = Không xét thưởng mà bỏ trống D2 → bắt buộc góp ý', () => {
    const loi = loiPhieu({
      xungDot: 'cung_phong',
      diem: { problem: 2, impact: 2, feasible: 2, safety: 2, scale: 2 },
      deXuat: 'khong_xet',
      gopY: '   ',
    });
    expect(loi).toHaveLength(1);
    expect(loi[0]).toContain('D2');
    expect(canGopY('khong_xet')).toBe(true);
    expect(canGopY('vuon_canh')).toBe(false);
  });

  it('chưa khai A4 và chưa chọn D1 → báo cả hai', () => {
    const loi = loiPhieu({ xungDot: null, diem: {}, deXuat: null, gopY: '' });
    expect(loi[0]).toContain('A4');
    expect(loi[loi.length - 1]).toContain('D1');
  });
});

describe('goiYMaYTuong — mã TCTH cấp dạng BHYI-<năm>-NNN', () => {
  it('đợt trống → số 001', () => {
    expect(goiYMaYTuong([], 2026)).toBe('BHYI-2026-001');
  });
  it('nối tiếp số lớn nhất đã cấp, bỏ qua mã không có số', () => {
    expect(goiYMaYTuong(
      [{ ideaCode: 'BHYI-2026-002' }, { ideaCode: 'BHYI-2026-010' }, { ideaCode: 'DAC-BIET' }],
      2026,
    )).toBe('BHYI-2026-011');
  });
});

describe('docTongHopRpc — đọc payload jsonb của RPC', () => {
  it('ánh xạ đủ trường và điểm null khi chưa có phiếu hợp lệ', () => {
    const kq = docTongHopRpc({
      round: { id: 'r1', name: 'Quý III/2026', status: 'closed' },
      items: [
        {
          item_id: 'i1', idea_id: 'y1', idea_code: 'BHYI-2026-001', proposed_tier: 'Lan tỏa',
          idea_title: 'Checklist giảm lỗi', department_name: 'Phòng DVKH', idea_level: 'Nội bộ CN',
          proposer: 'Nguyễn Văn A',
          total_votes: 3, counted_votes: 2, reference_votes: 1,
          avg_problem: 4.5, avg_impact: 4, avg_feasible: 4, avg_safety: 3.5, avg_scale: 4.5,
          avg_overall: 4.1,
          agree_vuon_canh: 2, agree_lan_toa: 2,
          rec_khong_xet: 0, rec_can_bo_sung: 0, rec_vuon_canh: 0, rec_lan_toa: 2,
          gop_y: ['Nên chuẩn hóa mẫu biểu'],
        },
        {
          item_id: 'i2', idea_id: 'y2', idea_code: 'BHYI-2026-002', proposed_tier: 'Vươn cành',
          idea_title: 'Mẫu tin nhắn KH', department_name: 'Phòng KHBL', idea_level: 'Nội bộ CN',
          proposer: 'Trần B',
          total_votes: 0, counted_votes: 0, reference_votes: 0,
          avg_problem: null, avg_impact: null, avg_feasible: null, avg_safety: null, avg_scale: null,
          avg_overall: null,
          agree_vuon_canh: 0, agree_lan_toa: 0,
          rec_khong_xet: 0, rec_can_bo_sung: 0, rec_vuon_canh: 0, rec_lan_toa: 0,
          gop_y: [],
        },
      ],
    });
    expect(kq.round.status).toBe('closed');
    expect(kq.items).toHaveLength(2);

    const [a, b] = kq.items;
    expect(a.ideaCode).toBe('BHYI-2026-001');
    expect(a.tongHop.soPhieuHopLe).toBe(2);
    expect(a.tongHop.diemTieuChi.safety).toBe(3.5);
    expect(a.gopY).toEqual(['Nên chuẩn hóa mẫu biểu']);
    // Dòng đủ điều kiện Lan tỏa (TB 4.1, nhân rộng 4.5, an toàn 3.5, 2/2 đồng ý)
    expect(ketLuanDeXuat(a.tongHop, a.proposedTier).tang).toBe('Lan tỏa');

    expect(b.tongHop.diemTbChung).toBeNull();
    expect(ketLuanDeXuat(b.tongHop, b.proposedTier).tang).toBeNull();
  });
});
