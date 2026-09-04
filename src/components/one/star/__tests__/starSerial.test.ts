import { describe, expect, it } from 'vitest';
import {
  buildHolderPools, buildStockPool, chuanHoaTen, daiBanGiaoGuiDuoc, deriveSerialStats,
  formatRanges, formatSerialList, parseSerialText, phanLoaiDaiBanGiao, suggestSerials,
  type StarSerialRow,
} from '../starSerial';
import { getKpiPoints, formatKpi } from '../starMath';

const row = (serialNo: number, status: StarSerialRow['status'], holder: string | null = null): StarSerialRow => ({
  serialNo, status, holderProfileId: holder, handoverId: null, recordId: null, note: null,
});

describe('parseSerialText — tách chuỗi serial trên phiếu thành danh sách số', () => {
  it('đọc được mọi kiểu ghi thực tế trong dữ liệu', () => {
    expect(parseSerialText('000084')).toEqual([84]);
    expect(parseSerialText('000072, 000082')).toEqual([72, 82]);
    expect(parseSerialText('29; 30')).toEqual([29, 30]);
    expect(parseSerialText('193, 196, 213')).toEqual([193, 196, 213]);
    expect(parseSerialText('000113,000120')).toEqual([113, 120]);
  });

  it('bỏ phần tử không phải số và chuỗi rỗng', () => {
    expect(parseSerialText('12, abc, 15')).toEqual([12, 15]);
    expect(parseSerialText('')).toEqual([]);
    expect(parseSerialText(null)).toEqual([]);
    expect(parseSerialText(undefined)).toEqual([]);
  });

  it('đọc được kiểu ngăn cách bằng chữ — ca thật "181 và 182" (12/08)', () => {
    expect(parseSerialText('181 và 182')).toEqual([181, 182]);
    expect(parseSerialText('29 - 30')).toEqual([29, 30]);
  });
});

describe('formatSerialList — chuẩn dạng lưu mới: tăng dần, không đệm 0', () => {
  it('sắp xếp và khử lặp', () => {
    expect(formatSerialList([213, 193, 196])).toBe('193, 196, 213');
    expect(formatSerialList([5, 5, 3])).toBe('3, 5');
    expect(formatSerialList([])).toBe('');
  });
});

describe('formatRanges — gom khoảng liền nhau để hiển thị gọn', () => {
  it('gom đúng các cụm', () => {
    expect(formatRanges([1, 2, 3, 7, 9, 10])).toBe('1–3, 7, 9–10');
    expect(formatRanges([5])).toBe('5');
    expect(formatRanges([])).toBe('');
    expect(formatRanges([3, 1, 2])).toBe('1–3');
  });
});

describe('deriveSerialStats + pools — tổng hợp sổ sao', () => {
  const rows: StarSerialRow[] = [
    row(1, 'in_stock'),
    row(2, 'in_stock'),
    row(3, 'handed_over', 'A'),
    row(4, 'handed_over', 'A'),
    row(5, 'handed_over', 'B'),
    row(6, 'awarded', 'A'),
    row(7, 'void'),
  ];

  it('đếm đúng theo trạng thái', () => {
    expect(deriveSerialStats(rows)).toEqual({ total: 7, inStock: 2, handedOver: 3, awarded: 1, voided: 1 });
  });

  it('pool theo người giữ chỉ gồm số CHƯA tặng, sắp tăng dần', () => {
    const pools = buildHolderPools(rows);
    expect(pools.get('A')).toEqual([3, 4]); // số 6 đã tặng, không còn trong pool
    expect(pools.get('B')).toEqual([5]);
  });

  it('kho tồn chỉ gồm in_stock', () => {
    expect(buildStockPool(rows)).toEqual([1, 2]);
  });

  it('gợi ý N số nhỏ nhất trong pool', () => {
    expect(suggestSerials([3, 4, 9], 2)).toEqual([3, 4]);
    expect(suggestSerials([3], 2)).toEqual([3]);
    expect(suggestSerials([], 1)).toEqual([]);
  });
});

describe('điểm KPI theo văn bản mục 5.1 — 0,5đ/sao, trần 10 điểm', () => {
  it('tính đúng và áp trần', () => {
    expect(getKpiPoints(1)).toBe(0.5);
    expect(getKpiPoints(3)).toBe(1.5);
    expect(getKpiPoints(20)).toBe(10);
    expect(getKpiPoints(25)).toBe(10); // vượt trần vẫn 10
    expect(getKpiPoints(0)).toBe(0);
  });

  it('hiển thị kiểu Việt Nam', () => {
    expect(formatKpi(0.5)).toBe('0,5');
    expect(formatKpi(10)).toBe('10');
  });
});

describe('phanLoaiDaiBanGiao — bàn giao giữa kỳ, dải lẫn cả sao đã tặng', () => {
  const GD = 'gd-1';       // Giám đốc Trần Đức Anh
  const PGD = 'pgd-1';     // PGĐ Nguyễn Đức Thái Hoàng
  // Dải LIỀN MẠCH 205–210 (số nào cũng đã khai báo lô) + vài số rời để thử ca chặn
  const rows: StarSerialRow[] = [
    row(205, 'awarded'), row(206, 'awarded'),   // Giám đốc tặng
    row(207, 'awarded'),                        // người khác tặng
    row(208, 'in_stock'), row(209, 'in_stock'), row(210, 'in_stock'),
    row(241, 'handed_over', PGD),               // PGĐ đang giữ
    row(250, 'handed_over', GD),                // chính Giám đốc đang giữ
    row(260, 'void'),
  ];
  const nguoiTang = new Map<number, string>([
    [205, 'Trần Đức Anh'], [206, 'Trần Đức Anh'], [207, 'Nguyễn Thị Vân Vĩnh'],
  ]);

  it('phân đúng bốn nhóm — dải 205–210 cho Giám đốc, lẫn cả sao đã tặng', () => {
    const pl = phanLoaiDaiBanGiao(205, 210, rows, nguoiTang, 'Trần Đức Anh', GD);
    expect(pl.hoiTo).toEqual([205, 206]);
    expect(pl.boQua).toEqual([207]);
    expect(pl.moi).toEqual([208, 209, 210]);
    expect(pl.chan).toHaveLength(0);
    expect(daiBanGiaoGuiDuoc(pl)).toBe(true);
  });

  it('số chưa khai báo lô nằm giữa dải thì chặn — không bàn giao qua khoảng trống', () => {
    const pl = phanLoaiDaiBanGiao(205, 212, rows, nguoiTang, 'Trần Đức Anh', GD);
    expect(pl.chuaKhaiBao).toEqual([211, 212]);
    expect(daiBanGiaoGuiDuoc(pl)).toBe(false);
  });

  it('giao nhầm người: sao của Giám đốc KHÔNG bị gán cho PGĐ', () => {
    const pl = phanLoaiDaiBanGiao(205, 207, rows, nguoiTang, 'Nguyễn Đức Thái Hoàng', PGD);
    expect(pl.hoiTo).toHaveLength(0);
    expect(pl.boQua).toEqual([205, 206, 207]);
    expect(daiBanGiaoGuiDuoc(pl)).toBe(false); // không có gì để ghi
  });

  it('lãnh đạo khác đang giữ thì chặn cả dải', () => {
    const pl = phanLoaiDaiBanGiao(241, 241, rows, nguoiTang, 'Trần Đức Anh', GD);
    expect(pl.chan).toEqual([241]);
    expect(daiBanGiaoGuiDuoc(pl)).toBe(false);
  });

  it('số đã hủy (sao hỏng) thì chặn', () => {
    const pl = phanLoaiDaiBanGiao(260, 260, rows, nguoiTang, 'Trần Đức Anh', GD);
    expect(pl.daHuy).toEqual([260]);
    expect(daiBanGiaoGuiDuoc(pl)).toBe(false);
  });

  it('số chính người đó đang giữ thì bỏ qua, không tính là xung đột', () => {
    const pl = phanLoaiDaiBanGiao(250, 250, rows, nguoiTang, 'Trần Đức Anh', GD);
    expect(pl.daGiu).toEqual([250]);
    expect(pl.chan).toHaveLength(0);
  });

  it('khớp tên phải bỏ dấu — ca thật "Thuý" trên phiếu vs "Thúy" trong danh bạ', () => {
    expect(chuanHoaTen('Dương Thị Thanh Thuý')).toBe(chuanHoaTen('Dương Thị Thanh Thúy'));
    const r = [row(300, 'awarded')];
    const pl = phanLoaiDaiBanGiao(300, 300, r, new Map([[300, 'Dương Thị Thanh Thuý']]),
      'Dương Thị Thanh Thúy', 'tp-1');
    expect(pl.hoiTo).toEqual([300]);
  });
});
