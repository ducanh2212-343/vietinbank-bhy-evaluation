import { describe, expect, it } from 'vitest';
import {
  buildHolderPools, buildStockPool, deriveSerialStats, formatRanges,
  formatSerialList, parseSerialText, suggestSerials, type StarSerialRow,
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
