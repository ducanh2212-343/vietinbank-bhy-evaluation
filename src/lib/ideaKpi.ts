import type { IdeaDevLevel } from '@/data/one/ideasConfig';

// KPI "Đổi mới sáng tạo" theo chương trình BHY Ideas.
//
// NGUỒN DUY NHẤT: Thông báo số …/TB-CNBHY-TCTH ngày 25/06/2026 "Cập nhật Thẻ
// điểm KPI các vị trí dưới Giám đốc Chi nhánh năm 2026" — Phụ lục 1B (khối
// kinh doanh), 1D (Phòng TCTH), 1E (Phòng HTTD). Hiệu lực từ 01/07/2026.
//
// ⚠️ NGUYÊN TẮC BẤT DI BẤT DỊCH (chỉ đạo 08/2026):
// KPI phải tuân thủ ĐÚNG văn bản, không được suy diễn, không được nới. Tiền
// thưởng thì khuyến khích được, KPI thì không. Vì vậy:
//
//   1. File này CHỈ tính KPI, KHÔNG biết gì về tiền, trần tuần hay ngân sách.
//      Tiền nằm ở src/lib/ideaRewards.ts và tuyệt đối không được tác động
//      ngược vào đây.
//   2. Trần 02 ý tưởng/tuần/phòng của quy chế THƯỞNG (mục 5) KHÔNG áp cho
//      KPI. Một ý tưởng đã được công nhận cấp độ thì tính KPI đầy đủ, kể cả
//      khi không được chi tiền do hết ngân sách — đúng tinh thần quy chế:
//      "Các ý tưởng vẫn được ghi nhận/vinh danh và có thể chuyển sang kỳ xét
//      thưởng tiếp theo."
//   3. Hệ số quy đổi của KPI (1 Vươn cành = 2 Bén rễ, 1 Lan tỏa = 3 Bén rễ)
//      là của RIÊNG KPI, khác hoàn toàn phép cộng dồn tiền thưởng lũy kế.

/** Nhóm vị trí áp thẻ điểm ĐMST (Phụ lục 1B mục 2–7, 1D/1E ghi chú (*)) */
export type NhomViTriKpi =
  | 'ban_giam_doc'   // Phụ lục 1B mục 1 — KHÔNG có chỉ tiêu ĐMST
  | 'tp_dau_moi'     // TP phòng đầu mối (KHDN, Bán lẻ, DVKH); TP TCTH & TP HTTD theo ghi chú (*)
  | 'tp_pgd'         // Trưởng Phòng giao dịch
  | 'pho_phong'      // Phó phòng Chi nhánh; PP/KSV TCTH & HTTD theo ghi chú (*)
  | 'can_bo';        // GDV, QHKH Bán lẻ/PGD, QHKH KHDN, cán bộ TCTH/HTTD

export const NHOM_VI_TRI_LABELS: Record<NhomViTriKpi, string> = {
  ban_giam_doc: 'Ban Giám đốc',
  tp_dau_moi: 'Trưởng phòng đầu mối (KHDN, Bán lẻ, DVKH, TCTH, HTTD)',
  tp_pgd: 'Trưởng Phòng giao dịch',
  pho_phong: 'Phó phòng / Kiểm soát viên',
  can_bo: 'Cán bộ (GDV, QHKH, CB TCTH/HTTD)',
};

/**
 * Trọng số chỉ tiêu ĐMST trong phần KPI Năng lực thực thi.
 * Lưu ý: Năng lực thực thi chiếm 20% tổng thẻ điểm KPI của cán bộ
 * (KPI = 80% Hiệu quả công việc + 20% Năng lực thực thi).
 * Ban Giám đốc: null vì Phụ lục 1B mục 1 không giao chỉ tiêu ĐMST.
 */
export const TRONG_SO_DMST: Record<NhomViTriKpi, number | null> = {
  ban_giam_doc: null,
  tp_dau_moi: 20,
  tp_pgd: 30,
  pho_phong: 30,
  can_bo: 20,
};

/** Trọng số riêng của khối back — Phụ lục 1D (TCTH) và 1E (HTTD) */
export const TRONG_SO_DMST_KHOI_BACK = {
  tcth: 5,
  httd: 10,
} as const;

/** %hoàn thành tối đa của chỉ tiêu ĐMST — Phụ lục 1B ghi 130% cho mọi nhóm có giao */
export const PHAN_TRAM_TOI_DA = 130;

/** Ngưỡng hoàn thành cấp độ Bén rễ với TP/PP — dưới ngưỡng quy 0 điểm */
export const NGUONG_BEN_RE = 0.9;

/** Chỉ tiêu cán bộ: 12 ý tưởng Ươm mầm HOẶC 6 ý tưởng Bén rễ (có quy đổi) */
export const CHI_TIEU_CAN_BO_UOM_MAM = 12;
export const CHI_TIEU_CAN_BO_BEN_RE = 6;

/**
 * Hệ số quy đổi về "ý tưởng Bén rễ" — nguyên văn Phụ lục 1B:
 * "1 ý tưởng cấp độ 'vươn cành' = 2 ý tưởng cấp độ 'bén rễ';
 *  1 ý tưởng cấp độ 'Lan tỏa' = 3 ý tưởng cấp độ 'bén rễ'".
 * Ươm mầm KHÔNG được văn bản cho quy đổi sang Bén rễ nên hệ số = 0;
 * Ươm mầm chỉ dùng cho đường chỉ tiêu 12 ý tưởng.
 */
export const HE_SO_QUY_DOI_BEN_RE: Record<IdeaDevLevel, number> = {
  'Ươm mầm': 0,
  'Bén rễ': 1,
  'Vươn cành': 2,
  'Lan tỏa': 3,
};

/** Số ý tưởng theo CẤP CAO NHẤT mỗi ý tưởng đạt được (không đếm trùng một ý tưởng ở nhiều cấp) */
export interface DemTheoCap {
  'Ươm mầm': number;
  'Bén rễ': number;
  'Vươn cành': number;
  'Lan tỏa': number;
}

export const demRong = (): DemTheoCap => ({
  'Ươm mầm': 0, 'Bén rễ': 0, 'Vươn cành': 0, 'Lan tỏa': 0,
});

/** Tổng số ý tưởng đã được công nhận từ cấp Ươm mầm trở lên */
export function tongSoYTuongDuocCongNhan(dem: DemTheoCap): number {
  return dem['Ươm mầm'] + dem['Bén rễ'] + dem['Vươn cành'] + dem['Lan tỏa'];
}

/** Điểm quy đổi ra "ý tưởng Bén rễ" theo hệ số Phụ lục 1B */
export function diemQuyDoiBenRe(dem: DemTheoCap): number {
  return (Object.keys(HE_SO_QUY_DOI_BEN_RE) as IdeaDevLevel[])
    .reduce((s, cap) => s + dem[cap] * HE_SO_QUY_DOI_BEN_RE[cap], 0);
}

/** Số ý tưởng đạt cấp Vươn cành hoặc Lan tỏa — dùng cho "điều kiện cần" của TP/PP */
export function soVuonCanhTroLen(dem: DemTheoCap): number {
  return dem['Vươn cành'] + dem['Lan tỏa'];
}

export interface KetQuaKpi {
  nhom: NhomViTriKpi;
  /** true = có giao chỉ tiêu ĐMST; false = không giao (Ban Giám đốc) */
  coGiaoChiTieu: boolean;
  dat: boolean;
  /** % hoàn thành đã chặn trần 130; 0 khi dưới ngưỡng */
  phanTramHoanThanh: number;
  /** Diễn giải để hiện trên báo cáo và đối chiếu khi TCTH nhập KPI */
  dienGiai: string[];
  /** Điều kiện chưa đạt — rỗng khi đã đạt */
  conThieu: string[];
}

/** Làm tròn % về 1 chữ số lẻ và chặn trần 130 */
function chuanHoaPhanTram(tyLe: number): number {
  const pt = Math.min(tyLe * 100, PHAN_TRAM_TOI_DA);
  return Math.round(Math.max(0, pt) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Cán bộ (GDV, QHKH, CB TCTH/HTTD)                                    */
/* ------------------------------------------------------------------ */

/**
 * Nguyên văn: "Số lượng ĐXCT đạt 12 ý tưởng cấp độ 'ươm mầm' HOẶC 6 ý tưởng
 * cấp độ 'Bén rễ'. Áp dụng quy đổi 1 vươn cành = 2 bén rễ, 1 lan tỏa = 3 bén rễ".
 *
 * Hai đường độc lập, đạt một trong hai là đạt; %HT lấy đường cao hơn.
 * Đường Ươm mầm đếm MỌI ý tưởng đã được công nhận (ý tưởng lên Bén rễ/Vươn
 * cành đương nhiên đã qua Ươm mầm) — cách đọc này có lợi cho cán bộ và không
 * trái văn bản; nếu TCTH muốn đếm nghiêm ngặt "đang dừng ở Ươm mầm" thì đổi
 * `tongSoYTuongDuocCongNhan(dem)` thành `dem['Ươm mầm']`.
 */
export function kpiCanBo(dem: DemTheoCap): KetQuaKpi {
  const soUomMam = tongSoYTuongDuocCongNhan(dem);
  const diemBenRe = diemQuyDoiBenRe(dem);

  const tyLeUomMam = soUomMam / CHI_TIEU_CAN_BO_UOM_MAM;
  const tyLeBenRe = diemBenRe / CHI_TIEU_CAN_BO_BEN_RE;
  const tyLe = Math.max(tyLeUomMam, tyLeBenRe);
  const dat = soUomMam >= CHI_TIEU_CAN_BO_UOM_MAM || diemBenRe >= CHI_TIEU_CAN_BO_BEN_RE;

  const dienGiai = [
    `Đường Ươm mầm: ${soUomMam}/${CHI_TIEU_CAN_BO_UOM_MAM} ý tưởng (${chuanHoaPhanTram(tyLeUomMam)}%)`,
    `Đường Bén rễ (đã quy đổi): ${diemBenRe}/${CHI_TIEU_CAN_BO_BEN_RE} (${chuanHoaPhanTram(tyLeBenRe)}%)`,
  ];
  const conThieu = dat ? [] : [
    `Còn thiếu ${Math.max(0, CHI_TIEU_CAN_BO_UOM_MAM - soUomMam)} ý tưởng Ươm mầm, hoặc ${Math.max(0, CHI_TIEU_CAN_BO_BEN_RE - diemBenRe)} điểm quy đổi Bén rễ`,
  ];

  return {
    nhom: 'can_bo',
    coGiaoChiTieu: true,
    dat,
    phanTramHoanThanh: chuanHoaPhanTram(tyLe),
    dienGiai,
    conThieu,
  };
}

/* ------------------------------------------------------------------ */
/* Trưởng phòng / Phó phòng                                            */
/* ------------------------------------------------------------------ */

export interface DauVaoLanhDao {
  /** Đếm theo cấp cao nhất của các ý tưởng thuộc PHẠM VI phụ trách */
  demPhong: DemTheoCap;
  /** Đếm theo cấp cao nhất của các ý tưởng do CHÍNH lãnh đạo đó đề xuất */
  demBanThan: DemTheoCap;
  /**
   * Số cán bộ làm mẫu số chỉ tiêu Bén rễ:
   *  - tp_dau_moi: số cán bộ của Phòng tại 31/05/2026
   *  - tp_pgd:     số cán bộ của Phòng tại 31/05/2026 (hàm tự nhân 2)
   *  - pho_phong:  số cán bộ phụ trách, TÍNH CẢ BẢN THÂN
   */
  soCanBo: number;
}

/** Chỉ tiêu số ý tưởng Bén rễ theo nhóm lãnh đạo */
export function chiTieuBenRe(nhom: NhomViTriKpi, soCanBo: number): number {
  if (nhom === 'tp_pgd') return soCanBo * 2;      // "tối thiểu bằng 2 lần số lượng cán bộ"
  if (nhom === 'tp_dau_moi' || nhom === 'pho_phong') return soCanBo;
  return 0;
}

/**
 * Điều kiện cần theo văn bản:
 *  - tp_dau_moi: Phòng có ≥ 2 "Vươn cành" HOẶC ≥ 1 "Lan tỏa";
 *                VÀ cá nhân Trưởng phòng có ≥ 1 ý tưởng "Vươn cành"/"Lan tỏa".
 *  - tp_pgd:     Phòng có ≥ 4 "Vươn cành" HOẶC ≥ 2 "Lan tỏa";
 *                VÀ cá nhân Trưởng phòng có ≥ 1 ý tưởng "Vươn cành"/"Lan tỏa".
 *  - pho_phong:  Bản thân có ≥ 1 ý tưởng "Vươn cành"/"Lan tỏa".
 */
export function kiemTraDieuKienCan(nhom: NhomViTriKpi, dv: DauVaoLanhDao): string[] {
  const thieu: string[] = [];
  const banThanCao = soVuonCanhTroLen(dv.demBanThan);

  if (nhom === 'tp_dau_moi') {
    const dukPhong = dv.demPhong['Vươn cành'] >= 2 || dv.demPhong['Lan tỏa'] >= 1;
    if (!dukPhong) {
      thieu.push(`Phòng cần ≥ 2 ý tưởng Vươn cành hoặc ≥ 1 Lan tỏa (hiện ${dv.demPhong['Vươn cành']} Vươn cành, ${dv.demPhong['Lan tỏa']} Lan tỏa)`);
    }
    if (banThanCao < 1) thieu.push('Cá nhân Trưởng phòng cần ≥ 1 ý tưởng đạt Vươn cành hoặc Lan tỏa');
  } else if (nhom === 'tp_pgd') {
    const dukPhong = dv.demPhong['Vươn cành'] >= 4 || dv.demPhong['Lan tỏa'] >= 2;
    if (!dukPhong) {
      thieu.push(`Phòng cần ≥ 4 ý tưởng Vươn cành hoặc ≥ 2 Lan tỏa (hiện ${dv.demPhong['Vươn cành']} Vươn cành, ${dv.demPhong['Lan tỏa']} Lan tỏa)`);
    }
    if (banThanCao < 1) thieu.push('Cá nhân Trưởng phòng cần ≥ 1 ý tưởng đạt Vươn cành hoặc Lan tỏa');
  } else if (nhom === 'pho_phong') {
    if (banThanCao < 1) thieu.push('Bản thân cần ≥ 1 ý tưởng đạt Vươn cành hoặc Lan tỏa');
  }
  return thieu;
}

/**
 * KPI ĐMST của lãnh đạo.
 *
 * Ngưỡng hoàn thành (nguyên văn): "Đạt điều kiện cần (cấp độ Vươn cành hoặc
 * Lan tỏa) và 90% với cấp độ Bén rễ"; "Dưới ngưỡng hoàn thành được quy là 0 điểm".
 *
 * Nên: thiếu điều kiện cần HOẶC Bén rễ < 90% chỉ tiêu → %HT = 0 (không phải
 * tính theo tỷ lệ đạt được).
 *
 * Số Bén rễ tính theo QUY ĐỔI của Phụ lục 1B — hệ số áp cho TOÀN BỘ văn bản
 * (chốt vận hành 16/08/2026): Bén rễ ×1, Vươn cành ×2, Lan tỏa ×3, Ươm mầm
 * không quy đổi. Bản trước đếm mỗi ý tưởng cấp cao chỉ bằng 1 «đã qua Bén rễ»
 * — đếm thiếu, thiệt cho lãnh đạo có ý tưởng được nhân rộng.
 */
export function kpiLanhDao(nhom: NhomViTriKpi, dv: DauVaoLanhDao): KetQuaKpi {
  if (nhom === 'ban_giam_doc') {
    return {
      nhom,
      coGiaoChiTieu: false,
      dat: true,
      phanTramHoanThanh: 0,
      dienGiai: ['Ban Giám đốc không được giao chỉ tiêu Đổi mới sáng tạo (Phụ lục 1B mục 1: Công tác đầu mối 40% · Phát triển đội ngũ kế cận 30% · Phát triển bản thân 30%)'],
      conThieu: [],
    };
  }
  if (nhom === 'can_bo') return kpiCanBo(dv.demPhong);

  const chiTieu = chiTieuBenRe(nhom, dv.soCanBo);
  const soBenRe = diemQuyDoiBenRe(dv.demPhong);
  const tyLe = chiTieu > 0 ? soBenRe / chiTieu : 0;
  const thieuDieuKien = kiemTraDieuKienCan(nhom, dv);
  const datNguongBenRe = chiTieu > 0 && tyLe >= NGUONG_BEN_RE;

  const conThieu = [...thieuDieuKien];
  if (!datNguongBenRe) {
    const canCo = Math.ceil(chiTieu * NGUONG_BEN_RE);
    conThieu.push(`Bén rễ (đã quy đổi) mới ${soBenRe}/${chiTieu} (${chuanHoaPhanTram(tyLe)}%) — cần tối thiểu ${canCo} điểm để đạt ngưỡng 90%`);
  }

  const dat = thieuDieuKien.length === 0 && datNguongBenRe;
  return {
    nhom,
    coGiaoChiTieu: true,
    dat,
    // Dưới ngưỡng quy 0 điểm — KHÔNG tính theo tỷ lệ đạt được
    phanTramHoanThanh: dat ? chuanHoaPhanTram(tyLe) : 0,
    dienGiai: [
      `Chỉ tiêu Bén rễ (đã quy đổi): ${soBenRe}/${chiTieu}${nhom === 'tp_pgd' ? ` (2 × ${dv.soCanBo} cán bộ)` : ` (theo ${dv.soCanBo} cán bộ)`}`,
      `Điều kiện cần: ${thieuDieuKien.length === 0 ? 'ĐẠT' : 'CHƯA ĐẠT'}`,
    ],
    conThieu,
  };
}

/**
 * Điểm KPI quy về thang trọng số của chỉ tiêu (VD trọng số 20, %HT 130 → 26).
 * Truyền `trongSoRieng` cho khối back: TCTH 5, HTTD 10.
 */
export function diemKpiTheoTrongSo(kq: KetQuaKpi, trongSoRieng?: number): number {
  if (!kq.coGiaoChiTieu) return 0;
  const trongSo = trongSoRieng ?? TRONG_SO_DMST[kq.nhom] ?? 0;
  return Math.round(trongSo * (kq.phanTramHoanThanh / 100) * 100) / 100;
}
