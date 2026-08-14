// Chấm điểm Hội đồng Bac Hung Yen Ideas — bộ câu hỏi Phụ lục 06 và ngưỡng xét
// thưởng mục VI.3 của quy chế chương trình. Mọi quy tắc điểm/ngưỡng nằm ở đây
// (thuần, unit-test được); SQL chỉ tính trung bình — phán quyết đạt/không đạt
// do file này quyết để một nguồn sự thật duy nhất.

export type XungDotLoiIch = 'khong' | 'cung_phong' | 'phoi_hop';
export type DeXuatHoiDong = 'khong_xet' | 'can_bo_sung' | 'vuon_canh' | 'lan_toa';
export type TangDeXuat = 'Vươn cành' | 'Lan tỏa';
export type TrangThaiDot = 'draft' | 'open' | 'closed';

export type TieuChiKey = 'problem' | 'impact' | 'feasible' | 'safety' | 'scale';

export interface TieuChiHoiDong {
  key: TieuChiKey;
  ma: string;
  ten: string;
  cauHoi: string;
}

/** C1-C5 — nguyên văn câu hỏi đánh giá của quy chế (mục VI.3 + Phụ lục 06) */
export const TIEU_CHI_HOI_DONG: TieuChiHoiDong[] = [
  {
    key: 'problem', ma: 'C1', ten: 'Đúng vấn đề',
    cauHoi: 'Ý tưởng có giải quyết một vấn đề thực tế, rõ ràng, đáng xử lý trong hoạt động của phòng/Chi nhánh không?',
  },
  {
    key: 'impact', ma: 'C2', ten: 'Hiệu quả/kết quả',
    cauHoi: 'Ý tưởng có bằng chứng tạo hiệu quả hoặc có khả năng tạo hiệu quả rõ ràng không?',
  },
  {
    key: 'feasible', ma: 'C3', ten: 'Khả thi',
    cauHoi: 'Ý tưởng có thể triển khai, duy trì hoặc tiếp tục thử nghiệm trong điều kiện thực tế của Chi nhánh không?',
  },
  {
    key: 'safety', ma: 'C4', ten: 'An toàn/rủi ro',
    cauHoi: 'Ý tưởng có bảo đảm tuân thủ quy định, bảo mật thông tin, an toàn vận hành và kiểm soát rủi ro không?',
  },
  {
    key: 'scale', ma: 'C5', ten: 'Nhân rộng/chuẩn hóa',
    cauHoi: 'Ý tưởng có thể chuẩn hóa thành checklist, mẫu biểu, hướng dẫn, quy trình, công cụ hoặc nhân rộng cho phòng/PGD khác không?',
  },
];

/** Mức điểm và ý nghĩa (Phụ lục 06) */
export const MUC_DIEM: { diem: number; yNghia: string }[] = [
  { diem: 1, yNghia: 'Không đạt' },
  { diem: 2, yNghia: 'Còn yếu, cần làm rõ nhiều' },
  { diem: 3, yNghia: 'Đạt mức tối thiểu' },
  { diem: 4, yNghia: 'Tốt' },
  { diem: 5, yNghia: 'Rất tốt, nên ưu tiên' },
];

/** A4 — khai báo xung đột lợi ích */
export const XUNG_DOT_LABELS: Record<XungDotLoiIch, string> = {
  khong: 'Không',
  cung_phong: 'Có — thuộc phòng/đơn vị đề xuất ý tưởng',
  phoi_hop: 'Có — liên quan phối hợp trực tiếp',
};

/** D1 — đề xuất của thành viên Hội đồng */
export const DE_XUAT_LABELS: Record<DeXuatHoiDong, string> = {
  khong_xet: 'Không xét thưởng',
  can_bo_sung: 'Cần bổ sung',
  vuon_canh: 'Đồng ý Cấp độ Vươn cành',
  lan_toa: 'Đồng ý Cấp độ Lan tỏa',
};

export const TRANG_THAI_DOT_LABELS: Record<TrangThaiDot, string> = {
  draft: 'Chuẩn bị',
  open: 'Đang chấm',
  closed: 'Đã chốt',
};

/** Mức thưởng theo tầng (mục VI.3) */
export const THUONG_THEO_TANG: Record<TangDeXuat, string> = {
  'Vươn cành': '1.000.000đ/ý tưởng',
  'Lan tỏa': '2.000.000–3.000.000đ/ý tưởng',
};

// Ngưỡng xét thưởng (mục VI.3). Tỷ lệ đồng ý so trên số phiếu hợp lệ
// (thành viên tham gia chấm, không tính phiếu tham khảo).
export const NGUONG_VUON_CANH = { diemTbChung: 3.5, diemAnToan: 3 } as const;
export const NGUONG_LAN_TOA = { diemTbChung: 4.0, diemNhanRong: 4, diemAnToan: 3 } as const;

// Sai số so sánh điểm trung bình (điểm từ SQL đã làm tròn 2 chữ số,
// từ client là phép chia số thực) — tránh 3.4999999 < 3.5 oan.
const EPS = 1e-9;

/** D2 bắt buộc khi thành viên đề xuất Không xét thưởng / Cần bổ sung */
export function canGopY(deXuat: DeXuatHoiDong): boolean {
  return deXuat === 'khong_xet' || deXuat === 'can_bo_sung';
}

export interface PhieuChamInput {
  xungDot: XungDotLoiIch | null;
  diem: Partial<Record<TieuChiKey, number>>;
  deXuat: DeXuatHoiDong | null;
  gopY: string;
}

/** Kiểm tra phiếu trước khi gửi — trả danh sách lỗi theo thứ tự trên form */
export function loiPhieu(phieu: PhieuChamInput): string[] {
  const loi: string[] = [];
  if (!phieu.xungDot) loi.push('Chưa khai báo xung đột lợi ích (A4)');
  for (const tc of TIEU_CHI_HOI_DONG) {
    const d = phieu.diem[tc.key];
    if (typeof d !== 'number' || d < 1 || d > 5) {
      loi.push(`Chưa chấm điểm tiêu chí ${tc.ma} — ${tc.ten}`);
    }
  }
  if (!phieu.deXuat) loi.push('Chưa chọn đề xuất của thành viên Hội đồng (D1)');
  else if (canGopY(phieu.deXuat) && !phieu.gopY.trim()) {
    loi.push(`Đề xuất «${DE_XUAT_LABELS[phieu.deXuat]}» bắt buộc nêu ý kiến góp ý (D2)`);
  }
  return loi;
}

/** Một phiếu chấm đã lưu — đầu vào của phép tổng hợp phía admin */
export interface PhieuCham {
  diem: Record<TieuChiKey, number>;
  deXuat: DeXuatHoiDong;
  /** Phiếu chỉ tính tham khảo (xung đột lợi ích) — loại khỏi điểm TB chính thức */
  thamKhao: boolean;
}

/** Kết quả tổng hợp một ý tưởng — đúng các cột Phụ lục 07 */
export interface TongHopYTuong {
  soPhieu: number;
  /** Số phiếu hợp lệ = tổng phiếu trừ phiếu tham khảo */
  soPhieuHopLe: number;
  soPhieuThamKhao: number;
  /** Điểm TB từng tiêu chí trên phiếu hợp lệ; null khi chưa có phiếu hợp lệ */
  diemTieuChi: Record<TieuChiKey, number | null>;
  /** Điểm TB chung = TB 5 tiêu chí */
  diemTbChung: number | null;
  /** Đồng ý Vươn cành tính cả phiếu đồng ý Lan tỏa (tầng cao hơn bao hàm tầng dưới) */
  soDongYVuonCanh: number;
  soDongYLanToa: number;
  deXuatDem: Record<DeXuatHoiDong, number>;
}

export function tongHopPhieu(phieu: PhieuCham[]): TongHopYTuong {
  const hopLe = phieu.filter(p => !p.thamKhao);
  const diemTieuChi = {} as Record<TieuChiKey, number | null>;
  for (const tc of TIEU_CHI_HOI_DONG) {
    diemTieuChi[tc.key] = hopLe.length
      ? hopLe.reduce((s, p) => s + p.diem[tc.key], 0) / hopLe.length
      : null;
  }
  const cacDiem = TIEU_CHI_HOI_DONG.map(tc => diemTieuChi[tc.key]);
  const diemTbChung = hopLe.length
    ? (cacDiem as number[]).reduce((a, b) => a + b, 0) / cacDiem.length
    : null;
  const deXuatDem: Record<DeXuatHoiDong, number> = { khong_xet: 0, can_bo_sung: 0, vuon_canh: 0, lan_toa: 0 };
  for (const p of hopLe) deXuatDem[p.deXuat] += 1;
  return {
    soPhieu: phieu.length,
    soPhieuHopLe: hopLe.length,
    soPhieuThamKhao: phieu.length - hopLe.length,
    diemTieuChi,
    diemTbChung,
    soDongYVuonCanh: deXuatDem.vuon_canh + deXuatDem.lan_toa,
    soDongYLanToa: deXuatDem.lan_toa,
    deXuatDem,
  };
}

/**
 * Đạt tỷ lệ "ít nhất 2/3 thành viên tham gia chấm đồng ý" — so sánh nguyên
 * (3 × đồng ý ≥ 2 × hợp lệ) để 2/3 phiếu đúng biên không trượt vì số thực.
 */
export function datTyLe2Phan3(soDongY: number, soPhieuHopLe: number): boolean {
  return soPhieuHopLe > 0 && soDongY * 3 >= soPhieuHopLe * 2;
}

export interface KetQuaNguong {
  dat: boolean;
  /** Các điều kiện chưa đạt — để TCTH trình Hội đồng có căn cứ */
  lyDo: string[];
}

/** Ngưỡng Cấp độ Vươn cành: TB chung ≥ 3,5 · An toàn/rủi ro ≥ 3 · ≥ 2/3 đồng ý */
export function xetVuonCanh(t: TongHopYTuong): KetQuaNguong {
  const lyDo: string[] = [];
  if (t.soPhieuHopLe === 0) lyDo.push('Chưa có phiếu chấm hợp lệ');
  else {
    if ((t.diemTbChung ?? 0) < NGUONG_VUON_CANH.diemTbChung - EPS) {
      lyDo.push(`Điểm TB chung ${formatDiem(t.diemTbChung)} < ${formatDiem(NGUONG_VUON_CANH.diemTbChung)}`);
    }
    if ((t.diemTieuChi.safety ?? 0) < NGUONG_VUON_CANH.diemAnToan - EPS) {
      lyDo.push(`Điểm An toàn/rủi ro ${formatDiem(t.diemTieuChi.safety)} < ${formatDiem(NGUONG_VUON_CANH.diemAnToan)}`);
    }
    if (!datTyLe2Phan3(t.soDongYVuonCanh, t.soPhieuHopLe)) {
      lyDo.push(`Mới ${t.soDongYVuonCanh}/${t.soPhieuHopLe} thành viên đồng ý (< 2/3)`);
    }
  }
  return { dat: lyDo.length === 0, lyDo };
}

/** Ngưỡng Cấp độ Lan tỏa: TB chung ≥ 4,0 · Nhân rộng ≥ 4 · An toàn ≥ 3 · ≥ 2/3 đồng ý */
export function xetLanToa(t: TongHopYTuong): KetQuaNguong {
  const lyDo: string[] = [];
  if (t.soPhieuHopLe === 0) lyDo.push('Chưa có phiếu chấm hợp lệ');
  else {
    if ((t.diemTbChung ?? 0) < NGUONG_LAN_TOA.diemTbChung - EPS) {
      lyDo.push(`Điểm TB chung ${formatDiem(t.diemTbChung)} < ${formatDiem(NGUONG_LAN_TOA.diemTbChung)}`);
    }
    if ((t.diemTieuChi.scale ?? 0) < NGUONG_LAN_TOA.diemNhanRong - EPS) {
      lyDo.push(`Điểm Nhân rộng/chuẩn hóa ${formatDiem(t.diemTieuChi.scale)} < ${formatDiem(NGUONG_LAN_TOA.diemNhanRong)}`);
    }
    if ((t.diemTieuChi.safety ?? 0) < NGUONG_LAN_TOA.diemAnToan - EPS) {
      lyDo.push(`Điểm An toàn/rủi ro ${formatDiem(t.diemTieuChi.safety)} < ${formatDiem(NGUONG_LAN_TOA.diemAnToan)}`);
    }
    if (!datTyLe2Phan3(t.soDongYLanToa, t.soPhieuHopLe)) {
      lyDo.push(`Mới ${t.soDongYLanToa}/${t.soPhieuHopLe} thành viên đồng ý Lan tỏa (< 2/3)`);
    }
  }
  return { dat: lyDo.length === 0, lyDo };
}

export interface KetLuanDeXuat {
  /** Tầng đạt ngưỡng cao nhất; null = chưa đạt tầng nào */
  tang: TangDeXuat | null;
  nhan: string;
  vuonCanh: KetQuaNguong;
  lanToa: KetQuaNguong;
}

/**
 * Kết luận HỆ THỐNG GỢI Ý theo ngưỡng — quyết định cuối cùng vẫn thuộc Hội
 * đồng (quy chế cho Hội đồng cân nhắc xung đột lợi ích, ngân sách…).
 * Chỉ xét tối đa đến tầng TCTH đề xuất: ý tưởng trình Vươn cành không được
 * gợi ý vượt lên Lan tỏa.
 */
export function ketLuanDeXuat(t: TongHopYTuong, tangDeXuat: TangDeXuat): KetLuanDeXuat {
  const vuonCanh = xetVuonCanh(t);
  const lanToa = xetLanToa(t);
  if (tangDeXuat === 'Lan tỏa' && lanToa.dat) {
    return { tang: 'Lan tỏa', nhan: 'Đạt ngưỡng Cấp độ Lan tỏa', vuonCanh, lanToa };
  }
  if (vuonCanh.dat) {
    return { tang: 'Vươn cành', nhan: 'Đạt ngưỡng Cấp độ Vươn cành', vuonCanh, lanToa };
  }
  return {
    tang: null,
    nhan: t.soPhieuHopLe === 0 ? 'Chưa có phiếu chấm hợp lệ' : 'Chưa đạt ngưỡng xét thưởng',
    vuonCanh,
    lanToa,
  };
}

/** Gợi ý mã kế tiếp TCTH cấp trong đợt: BHYI-<năm>-NNN theo số lớn nhất đã cấp */
export function goiYMaYTuong(daCap: { ideaCode: string }[], nam: number): string {
  const soLonNhat = daCap.reduce((max, it) => {
    const m = /(\d+)\s*$/.exec(it.ideaCode);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `BHYI-${nam}-${String(soLonNhat + 1).padStart(3, '0')}`;
}

export function formatDiem(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function formatTyLe(soDongY: number, soPhieuHopLe: number): string {
  if (soPhieuHopLe === 0) return '—';
  return `${Math.round((soDongY / soPhieuHopLe) * 100)}%`;
}

/** Một dòng tổng hợp từ RPC bhy_ideas_hd_tong_hop — cột theo Phụ lục 07 */
export interface DongTongHopRpc {
  itemId: string;
  ideaId: string;
  ideaCode: string;
  proposedTier: TangDeXuat;
  ideaTitle: string;
  departmentName: string;
  ideaLevel: string;
  proposer: string;
  tongHop: TongHopYTuong;
  gopY: string[];
}

/** Đọc payload jsonb của RPC về cấu trúc TongHopYTuong dùng chung với client */
export function docTongHopRpc(payload: unknown): { round: { id: string; name: string; status: TrangThaiDot }; items: DongTongHopRpc[] } {
  const raw = payload as {
    round: { id: string; name: string; status: TrangThaiDot };
    items: Array<Record<string, unknown>>;
  };
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const int = (v: unknown): number => (typeof v === 'number' ? v : 0);
  return {
    round: raw.round,
    items: (raw.items ?? []).map((r): DongTongHopRpc => {
      const deXuatDem: Record<DeXuatHoiDong, number> = {
        khong_xet: int(r.rec_khong_xet),
        can_bo_sung: int(r.rec_can_bo_sung),
        vuon_canh: int(r.rec_vuon_canh),
        lan_toa: int(r.rec_lan_toa),
      };
      return {
        itemId: String(r.item_id),
        ideaId: String(r.idea_id),
        ideaCode: String(r.idea_code),
        proposedTier: r.proposed_tier as TangDeXuat,
        ideaTitle: String(r.idea_title ?? ''),
        departmentName: String(r.department_name ?? ''),
        ideaLevel: String(r.idea_level ?? ''),
        proposer: String(r.proposer ?? ''),
        tongHop: {
          soPhieu: int(r.total_votes),
          soPhieuHopLe: int(r.counted_votes),
          soPhieuThamKhao: int(r.reference_votes),
          diemTieuChi: {
            problem: num(r.avg_problem),
            impact: num(r.avg_impact),
            feasible: num(r.avg_feasible),
            safety: num(r.avg_safety),
            scale: num(r.avg_scale),
          },
          diemTbChung: num(r.avg_overall),
          soDongYVuonCanh: int(r.agree_vuon_canh),
          soDongYLanToa: int(r.agree_lan_toa),
          deXuatDem,
        },
        gopY: Array.isArray(r.gop_y) ? (r.gop_y as string[]) : [],
      };
    }),
  };
}
