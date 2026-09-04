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
  { group: 'Trưởng phòng DVKH, Khoái Châu, Văn Giang, Văn Lâm, Ocean City — Yên Mỹ cũ (10–13 người)', perQuarter: 6, perYear: 24 },
  { group: 'Trưởng phòng Bán lẻ, Ân Thi, HTTD (7–9 người)', perQuarter: 5, perYear: 20 },
  { group: 'Giám đốc Chi nhánh', perQuarter: 12, perYear: 48 },
  { group: 'Mỗi Phó giám đốc (3 PGĐ)', perQuarter: 10, perYear: 40 },
];

/** Tổng sao phát ra trong năm theo văn bản (412) — đối chiếu tổng khai báo lô */
export const TOTAL_ALLOCATED_2026 = 412;

/**
 * Chuẩn hóa họ tên để so khớp: bỏ dấu, bỏ hoa/thường, gộp khoảng trắng.
 *
 * Phải BỎ DẤU: phiếu ghi "Dương Thị Thanh Thuý" còn danh bạ ghi "Dương Thị Thanh
 * Thúy" (dấu sắc ở u thay vì y) — so thẳng chuỗi thì bỏ sót 16 sao của chị. Đối
 * xứng với hàm SQL `bhy_chuan_hoa_ten` mà RPC handover_stars dùng; hai bên phải
 * cho cùng kết quả, nếu sửa thì sửa cả hai.
 */
export const chuanHoaTen = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export interface PhanLoaiBanGiao {
  /** Còn trong kho → bàn giao bình thường */
  moi: number[];
  /** Đã tặng bởi CHÍNH lãnh đạo này → ghi hồi tố nguồn gốc, giữ trạng thái đã tặng */
  hoiTo: number[];
  /** Đã tặng bởi người khác → bỏ qua, không gán bừa */
  boQua: number[];
  /** Chính lãnh đạo này đang giữ từ đợt trước */
  daGiu: number[];
  /** Lãnh đạo KHÁC đang giữ (chưa tặng) → chặn cả lệnh */
  chan: number[];
  /** Chưa khai báo lô in → chặn */
  chuaKhaiBao: number[];
  /** Đã hủy (sao hỏng) → chặn */
  daHuy: number[];
}

/**
 * Phân loại từng số trong dải bàn giao — bản chạy trên trình duyệt của luật trong
 * RPC `handover_stars`, để TCTH thấy trước khi bấm thay vì gửi rồi mới biết.
 *
 * BÀN GIAO GIỮA KỲ: sổ sao ra đời khi hàng trăm sao đã phát từ trước, nên dải số
 * TCTH thực tế đã đưa cho một lãnh đạo luôn lẫn cả số đã tặng. Chặn cứng cả dải
 * (bản đầu) bắt TCTH tự dò từng đoạn trống — rất nặng. Thay vào đó phân loại và
 * chỉ chặn khi có xung đột thật.
 *
 * @param nguoiTangTheoSo  số serial → tên người tặng trên phiếu (rỗng nếu chưa rõ)
 * @param tenLanhDao       họ tên lãnh đạo nhận bàn giao
 */
export const phanLoaiDaiBanGiao = (
  from: number,
  to: number,
  rows: StarSerialRow[],
  nguoiTangTheoSo: Map<number, string>,
  tenLanhDao: string,
  profileIdLanhDao: string | null,
): PhanLoaiBanGiao => {
  const kq: PhanLoaiBanGiao = {
    moi: [], hoiTo: [], boQua: [], daGiu: [], chan: [], chuaKhaiBao: [], daHuy: [],
  };
  const theoSo = new Map(rows.map((r) => [r.serialNo, r]));
  const tenChuan = chuanHoaTen(tenLanhDao);

  for (let n = from; n <= to; n += 1) {
    const r = theoSo.get(n);
    if (!r) { kq.chuaKhaiBao.push(n); continue; }
    if (r.status === 'void') { kq.daHuy.push(n); continue; }
    if (r.status === 'in_stock') { kq.moi.push(n); continue; }
    if (r.status === 'handed_over') {
      if (profileIdLanhDao && r.holderProfileId === profileIdLanhDao) kq.daGiu.push(n);
      else kq.chan.push(n);
      continue;
    }
    // awarded
    if (r.holderProfileId) {
      // đã biết ra từ túi ai rồi
      if (profileIdLanhDao && r.holderProfileId === profileIdLanhDao) kq.daGiu.push(n);
      else kq.boQua.push(n);
      continue;
    }
    const nguoiTang = nguoiTangTheoSo.get(n) ?? '';
    if (nguoiTang && tenChuan && chuanHoaTen(nguoiTang) === tenChuan) kq.hoiTo.push(n);
    else kq.boQua.push(n);
  }
  return kq;
};

/** Dải có gửi được không: không xung đột cứng, và có ít nhất một số đóng góp */
export const daiBanGiaoGuiDuoc = (pl: PhanLoaiBanGiao): boolean =>
  pl.chan.length === 0 && pl.chuaKhaiBao.length === 0 && pl.daHuy.length === 0
  && (pl.moi.length > 0 || pl.hoiTo.length > 0);

export interface SerialNhapBu {
  so: number;
  /** 'chua-khai-bao' = số chưa có trong sổ (chưa khai báo lô in) */
  trangThai: SerialStatus | 'chua-khai-bao';
  /** Có ghi phiếu nhập bù lên số này được không */
  dungDuoc: boolean;
  /** Hồ sơ đang giữ số (khi status = handed_over) */
  nguoiGiuId: string | null;
  /** Câu giải thích ngắn hiện trên chip */
  giaiThich: string;
}

/**
 * Phân loại từng số serial người dùng GÕ TAY ở chế độ nhập bù — bản chạy trên
 * trình duyệt của luật trong RPC `award_star` nhánh 'backfill'.
 *
 * VÌ SAO GÕ TAY chứ không chọn từ pool: sao nhập bù là sao ĐÃ TRAO ngoài đời rồi,
 * người nhập cầm tờ phiếu / tin Zalo có sẵn con số. Số đó có thể còn nằm trong kho
 * (chưa kịp ghi bàn giao) hoặc đang ở tay lãnh đạo — hai pool khác nhau, không
 * gộp thành một ô chọn được. Đổi lại phải soi từng số ngay khi gõ để người nhập
 * biết trước số nào vướng, thay vì gửi lên rồi mới nhận lỗi.
 */
export const phanLoaiSerialNhapBu = (
  nums: number[],
  rows: StarSerialRow[],
): SerialNhapBu[] => {
  const theoSo = new Map(rows.map((r) => [r.serialNo, r]));
  return [...new Set(nums)].sort((a, b) => a - b).map((so) => {
    const r = theoSo.get(so);
    if (!r) {
      return {
        so, trangThai: 'chua-khai-bao' as const, dungDuoc: false, nguoiGiuId: null,
        giaiThich: 'chưa khai báo lô in — khai báo ở Quản lý Sao trước',
      };
    }
    if (r.status === 'void') {
      return { so, trangThai: r.status, dungDuoc: false, nguoiGiuId: null, giaiThich: 'số đã hủy (sao hỏng)' };
    }
    if (r.status === 'awarded') {
      return { so, trangThai: r.status, dungDuoc: false, nguoiGiuId: r.holderProfileId, giaiThich: 'đã gắn một phiếu khác' };
    }
    if (r.status === 'handed_over') {
      return { so, trangThai: r.status, dungDuoc: true, nguoiGiuId: r.holderProfileId, giaiThich: 'đang ở tay lãnh đạo' };
    }
    return { so, trangThai: r.status, dungDuoc: true, nguoiGiuId: null, giaiThich: 'còn trong kho TCTH' };
  });
};

/** Số serial nhập bù dùng được hết chưa (điều kiện để bật nút xác nhận) */
export const nhapBuDungDuoc = (ds: SerialNhapBu[]): boolean =>
  ds.length > 0 && ds.every((x) => x.dungDuoc);
