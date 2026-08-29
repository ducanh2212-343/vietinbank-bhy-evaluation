// Logic thuần cho SỔ SAO (bảng star_serials) — tách khỏi hooks để kiểm thử được.
//
// Nguyên tắc chi nhánh (chốt 08/2026): sao được ghi nhận theo SỐ SERIAL. Mỗi số
// là một ngôi sao vật lý in sẵn, đóng số bằng tay; một số chỉ được dùng một lần.
// Vòng đời: in_stock (kho TCTH) → handed_over (lãnh đạo giữ) → awarded (đã tặng);
// số hỏng chuyển void. Hàng rào chống trùng nằm trong RPC award_star phía CSDL —
// các hàm ở đây chỉ phục vụ hiển thị và chọn số trên giao diện.

export type SerialStatus = 'in_stock' | 'handed_over' | 'awarded' | 'void';

export interface StarSerialRow {
  serialNo: number;
  status: SerialStatus;
  holderProfileId: string | null;
  handoverId: string | null;
  recordId: string | null;
  note: string | null;
}

/**
 * Tách chuỗi serial trên phiếu thành danh sách số. Dữ liệu cũ có đủ kiểu:
 * "000084", "000072, 000082", "29; 30", "193, 196, 213", và cả "181 và 182"
 * (người nhập viết chữ "và"). Vì vậy tách theo MỌI đoạn không phải chữ số —
 * mọi ký tự ngăn cách đều chấp nhận, bỏ số 0 đệm đầu.
 */
export const parseSerialText = (text: string | null | undefined): number[] => {
  if (!text) return [];
  return text
    .split(/[^0-9]+/)
    .filter((t) => t.length > 0)
    .map((t) => parseInt(t, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
};

/** Danh sách số → chuỗi lưu trên phiếu: tăng dần, cách nhau ", ", không đệm số 0 */
export const formatSerialList = (nums: number[]): string =>
  [...new Set(nums)].sort((a, b) => a - b).join(', ');

/** Gom dãy số thành các khoảng liền nhau để hiển thị gọn: [1,2,3,7,9,10] → "1–3, 7, 9–10" */
export const formatRanges = (nums: number[]): string => {
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  const parts: string[] = [];
  let from = sorted[0];
  let to = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const n = sorted[i];
    if (n === to + 1) {
      to = n;
      continue;
    }
    parts.push(from === to ? `${from}` : `${from}–${to}`);
    if (n !== undefined) {
      from = n;
      to = n;
    }
  }
  return parts.join(', ');
};

export interface SerialStats {
  total: number;
  inStock: number;
  handedOver: number;
  awarded: number;
  voided: number;
}

export const deriveSerialStats = (rows: StarSerialRow[]): SerialStats => {
  const stats: SerialStats = { total: rows.length, inStock: 0, handedOver: 0, awarded: 0, voided: 0 };
  rows.forEach((r) => {
    if (r.status === 'in_stock') stats.inStock += 1;
    else if (r.status === 'handed_over') stats.handedOver += 1;
    else if (r.status === 'awarded') stats.awarded += 1;
    else stats.voided += 1;
  });
  return stats;
};

/** Số sao MỖI LÃNH ĐẠO đang giữ (đã bàn giao, chưa tặng), sắp tăng dần */
export const buildHolderPools = (rows: StarSerialRow[]): Map<string, number[]> => {
  const pools = new Map<string, number[]>();
  rows.forEach((r) => {
    if (r.status !== 'handed_over' || !r.holderProfileId) return;
    const pool = pools.get(r.holderProfileId) ?? [];
    pool.push(r.serialNo);
    pools.set(r.holderProfileId, pool);
  });
  pools.forEach((p) => p.sort((a, b) => a - b));
  return pools;
};

/** Số sao tồn kho TCTH (chưa bàn giao) — nguồn cho sao chương trình động lực */
export const buildStockPool = (rows: StarSerialRow[]): number[] =>
  rows
    .filter((r) => r.status === 'in_stock')
    .map((r) => r.serialNo)
    .sort((a, b) => a - b);

/** Gợi ý N số nhỏ nhất trong pool (thói quen phát sao: dùng số bé trước) */
export const suggestSerials = (pool: number[], n: number): number[] => pool.slice(0, Math.max(0, n));

/**
 * Bảng phân bổ sao/quý theo văn bản triển khai mục 4 — dùng làm bảng tham chiếu
 * khi TCTH bàn giao (không phải ràng buộc cứng: văn bản cho phép sao ngoài phân
 * bổ từ các chương trình/chiến dịch).
 */
export const QUARTERLY_ALLOCATION: Array<{ group: string; perQuarter: number; perYear: number }> = [
  { group: 'Trưởng phòng TCTH / KHDN (phòng ≥ 14 người)', perQuarter: 8, perYear: 32 },
  { group: 'Trưởng phòng DVKH, Khoái Châu, Văn Giang, Văn Lâm, Yên Mỹ (10–13 người)', perQuarter: 6, perYear: 24 },
  { group: 'Trưởng phòng Bán lẻ, Ân Thi, HTTD (7–9 người)', perQuarter: 5, perYear: 20 },
  { group: 'Giám đốc Chi nhánh', perQuarter: 12, perYear: 48 },
  { group: 'Mỗi Phó giám đốc (3 PGĐ)', perQuarter: 10, perYear: 40 },
];

/** Tổng sao phát ra trong năm theo văn bản (412) — đối chiếu tổng khai báo lô */
export const TOTAL_ALLOCATED_2026 = 412;
