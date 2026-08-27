// Bảng câu hỏi THAM KHẢO khi xét cấp Bén rễ — dùng chung cho Phòng TCTH khi
// trình và Giám đốc khi duyệt.
//
// VÌ SAO CẦN BỘ RIÊNG, KHÔNG DÙNG PHỤ LỤC 06 CỦA HỘI ĐỒNG
//
// Quy chế đặt điều kiện Bén rễ là: "Ý tưởng có KHẢ NĂNG THỬ NGHIỆM tại Chi
// nhánh, HOẶC được TSC phê duyệt Đồng ý / Đồng ý một phần". Tức là cấp này hỏi
// «có đáng bỏ công làm thử không», chứ chưa hỏi «làm rồi kết quả ra sao».
//
// Trong khi đó Phụ lục 06 của Hội đồng chấm Vươn cành và Lan tỏa, đòi ý tưởng
// ĐÃ triển khai và CÓ bằng chứng kết quả. Lấy thang đó áp cho Bén rễ thì gần
// như không ý tưởng nào qua được — chặn ngay ở cửa đầu tiên của cả hành trình.
//
// Nên bộ này cố ý ĐẶT THẤP HƠN, và thấp một cách có cấu trúc:
//
//   | | Hội đồng (Vươn cành / Lan tỏa) | Bén rễ (bộ này)          |
//   |-|--------------------------------|--------------------------|
//   | Thang    | 5 tiêu chí × 1–5      | 5 câu × 0–2              |
//   | Ngưỡng   | TB ≥ 3,5 / ≥ 4,0      | Tổng ≥ 6/10 (60%)        |
//   | Chặn     | An toàn rủi ro ≥ 3/5  | Câu Đ4 ≥ 1               |
//   | Đòi hỏi  | ĐÃ có kết quả         | CÓ THỂ làm thử           |
//
// VÀ ĐÂY LÀ BẢNG THAM KHẢO, KHÔNG PHẢI BỘ GÁC.
// Hàm dưới đây chỉ trả về GỢI Ý. Phòng TCTH vẫn trình được ý tưởng điểm thấp
// nếu thấy có lý do, Giám đốc vẫn duyệt hoặc từ chối theo thẩm quyền bất kể
// điểm bao nhiêu. Quyền quyết định thuộc về người, phần mềm chỉ dọn sẵn thông
// tin để hai bên nói cùng một ngôn ngữ.

export type MaCauHoiBenRe = 'd1' | 'd2' | 'd3' | 'd4' | 'd5';

export interface CauHoiBenRe {
  ma: MaCauHoiBenRe;
  tieuDe: string;
  moTa: string;
  /** Câu mang tính chặn: điểm 0 ở đây thì gợi ý luôn là chưa nên trình */
  laDieuKienChan?: boolean;
}

/**
 * Năm câu, xếp theo đúng mạch người đọc phiếu ý tưởng: có vấn đề thật không →
 * giải pháp có rõ không → làm được không → có an toàn không → có ích không.
 */
export const CAU_HOI_BEN_RE: readonly CauHoiBenRe[] = [
  {
    ma: 'd1',
    tieuDe: 'Vấn đề có thật',
    moTa: 'Thực trạng nêu trong phiếu là bất cập đang thực sự xảy ra tại Chi nhánh, không phải giả định.',
  },
  {
    ma: 'd2',
    tieuDe: 'Giải pháp đủ rõ để làm thử',
    moTa: 'Mô tả cụ thể tới mức giao được cho người thực hiện, không dừng ở mong muốn chung chung.',
  },
  {
    ma: 'd3',
    tieuDe: 'Làm được bằng nguồn lực sẵn có',
    moTa: 'Thử nghiệm được ngay tại Chi nhánh, không phải chờ đầu tư lớn hay xin cơ chế mới từ Trụ sở chính.',
  },
  {
    ma: 'd4',
    tieuDe: 'Không tạo rủi ro mới',
    moTa: 'Không trái quy định hiện hành, không phát sinh rủi ro tác nghiệp hay tuân thủ đáng kể.',
    laDieuKienChan: true,
  },
  {
    ma: 'd5',
    tieuDe: 'Có ích cho ít nhất một bộ phận',
    moTa: 'Nếu chạy được thì giảm thời gian, chi phí, sai sót, hoặc tăng trải nghiệm khách hàng.',
  },
] as const;

/** Thang điểm 0–2 — cố ý ngắn để chấm nhanh, khác thang 1–5 của Hội đồng */
export const MUC_DIEM_BEN_RE = [
  { diem: 0, nhan: 'Không', moTa: 'Chưa đáp ứng' },
  { diem: 1, nhan: 'Một phần', moTa: 'Đáp ứng được phần nào' },
  { diem: 2, nhan: 'Có', moTa: 'Đáp ứng rõ ràng' },
] as const;

export const DIEM_TOI_DA_BEN_RE = CAU_HOI_BEN_RE.length * 2; // 10

/** Tổng điểm từ đó gợi ý nên trình Giám đốc */
export const NGUONG_NEN_TRINH = 6;
/** Dưới mức này thì gợi ý là chưa nên trình */
export const NGUONG_CAN_NHAC = 4;

export type KetLuanBenRe = 'nen_trinh' | 'can_nhac' | 'chua_nen';

export const KET_LUAN_BEN_RE_INFO: Record<KetLuanBenRe, {
  nhan: string;
  moTa: string;
  lopMau: string;
}> = {
  nen_trinh: {
    nhan: 'Nên trình Giám đốc',
    moTa: 'Ý tưởng đủ rõ và đủ an toàn để thử nghiệm tại Chi nhánh.',
    lopMau: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  can_nhac: {
    nhan: 'Cân nhắc — nên bổ sung',
    moTa: 'Còn điểm chưa rõ; trao đổi thêm với người đề xuất trước khi trình sẽ chắc hơn.',
    lopMau: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  chua_nen: {
    nhan: 'Chưa nên trình',
    moTa: 'Chưa đủ căn cứ để thử nghiệm, hoặc có rủi ro cần xử lý trước.',
    lopMau: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

/** Phiếu đánh giá — thiếu câu nào thì câu đó chưa chấm (undefined) */
export type PhieuBenRe = Partial<Record<MaCauHoiBenRe, number>> & { ghiChu?: string };

export interface KetQuaBenRe {
  tongDiem: number;
  diemToiDa: number;
  /** Đã chấm đủ 5 câu chưa */
  daChamDu: boolean;
  soCauDaCham: number;
  ketLuan: KetLuanBenRe;
  /** Câu điều kiện chặn bị chấm 0 — nêu riêng vì nó lấn át tổng điểm */
  vuongDieuKienChan: boolean;
  /** Câu diễn giải để hiện cạnh kết luận */
  dienGiai: string;
}

const chuanHoaDiem = (v: number | undefined): number | undefined => {
  if (v === undefined || v === null || !Number.isFinite(v)) return undefined;
  return Math.min(2, Math.max(0, Math.round(v)));
};

/**
 * Chấm phiếu tham khảo.
 *
 * Quy tắc kết luận, theo thứ tự:
 *   1. Câu Đ4 (không tạo rủi ro mới) bị chấm 0 → «Chưa nên trình», bất kể tổng
 *      điểm — rủi ro không bù được bằng điểm cao ở chỗ khác.
 *   2. Tổng ≥ 6/10 → «Nên trình».
 *   3. Tổng 4–5 → «Cân nhắc».
 *   4. Dưới 4 → «Chưa nên trình».
 *
 * Phiếu chấm dở vẫn tính được tổng phần đã chấm; `daChamDu` cho giao diện biết
 * mà nhắc, chứ không tự ý coi câu chưa chấm là 0 điểm.
 */
export function chamPhieuBenRe(phieu: PhieuBenRe): KetQuaBenRe {
  const diem = CAU_HOI_BEN_RE.map(c => chuanHoaDiem(phieu[c.ma]));
  const soCauDaCham = diem.filter(d => d !== undefined).length;
  const tongDiem = diem.reduce<number>((s, d) => s + (d ?? 0), 0);
  const daChamDu = soCauDaCham === CAU_HOI_BEN_RE.length;

  const viTriChan = CAU_HOI_BEN_RE.findIndex(c => c.laDieuKienChan);
  const vuongDieuKienChan = viTriChan >= 0 && diem[viTriChan] === 0;

  let ketLuan: KetLuanBenRe;
  if (vuongDieuKienChan) ketLuan = 'chua_nen';
  else if (tongDiem >= NGUONG_NEN_TRINH) ketLuan = 'nen_trinh';
  else if (tongDiem >= NGUONG_CAN_NHAC) ketLuan = 'can_nhac';
  else ketLuan = 'chua_nen';

  const dienGiai = vuongDieuKienChan
    ? `Câu «${CAU_HOI_BEN_RE[viTriChan].tieuDe}» bị chấm 0 — cần xử lý rủi ro trước khi trình, không bù bằng điểm các câu khác.`
    : `Tổng ${tongDiem}/${DIEM_TOI_DA_BEN_RE} điểm${daChamDu ? '' : ` (mới chấm ${soCauDaCham}/${CAU_HOI_BEN_RE.length} câu)`}.`;

  return {
    tongDiem,
    diemToiDa: DIEM_TOI_DA_BEN_RE,
    daChamDu,
    soCauDaCham,
    ketLuan,
    vuongDieuKienChan,
    dienGiai,
  };
}

/** Phiếu rỗng để khởi tạo biểu mẫu */
export const phieuBenReRong = (): PhieuBenRe => ({});

/** Có câu nào được chấm chưa — dùng để biết phiếu có nội dung hay không */
export function phieuCoNoiDung(phieu: PhieuBenRe | null | undefined): boolean {
  if (!phieu) return false;
  return CAU_HOI_BEN_RE.some(c => chuanHoaDiem(phieu[c.ma]) !== undefined)
    || !!phieu.ghiChu?.trim();
}

/**
 * Đọc phiếu từ JSONB của CSDL về kiểu dùng được ở giao diện.
 * Dữ liệu cũ hoặc hỏng thì trả phiếu rỗng chứ không ném lỗi — đây là thông tin
 * tham khảo, không đáng làm vỡ cả màn hình duyệt.
 */
export function docPhieuBenRe(raw: unknown): PhieuBenRe {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: PhieuBenRe = {};
  for (const c of CAU_HOI_BEN_RE) {
    const v = chuanHoaDiem(typeof o[c.ma] === 'number' ? (o[c.ma] as number) : undefined);
    if (v !== undefined) out[c.ma] = v;
  }
  const gc = o.ghi_chu ?? o.ghiChu;
  if (typeof gc === 'string' && gc.trim()) out.ghiChu = gc.trim();
  return out;
}

/** Đóng gói phiếu để gửi xuống CSDL (khóa snake_case cho đồng bộ với SQL) */
export function goiPhieuBenRe(phieu: PhieuBenRe): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const c of CAU_HOI_BEN_RE) {
    const v = chuanHoaDiem(phieu[c.ma]);
    if (v !== undefined) out[c.ma] = v;
  }
  if (phieu.ghiChu?.trim()) out.ghi_chu = phieu.ghiChu.trim();
  return out;
}

// ---------------------------------------------------------------------------
// HAI ĐƯỜNG LÊN BÉN RỄ — chọn đường theo CẤP ĐỀ XUẤT của ý tưởng
//
// Quy chế mục 4 mở hai đường, và mỗi đường là một việc khác hẳn nhau:
//
//   Nội bộ CN   → TCTH chấm phiếu 5 câu rồi TRÌNH GIÁM ĐỐC quyết
//   Đề xuất TSC → TCTH khớp trạng thái với phê duyệt của Trụ sở chính ở màn
//                 Đối chiếu SMP; hệ thống tự ghi nhận, KHÔNG qua Giám đốc
//
// Vận hành 27/08/2026, Phòng TCTH nêu đúng chỗ vướng: màn đánh giá đổ chung
// một danh sách nên phải lướt 109 phiếu đường 2 để tìm 44 phiếu đường 1 —
// phần việc cần làm lại là phần bị lẫn nhiều nhất.
// ---------------------------------------------------------------------------

/** Ý tưởng cấp đề xuất này có phải chấm phiếu rồi trình Giám đốc không? */
export function canChamPhieuBenRe(capDeXuat: string | null | undefined): boolean {
  return capDeXuat !== 'Đề xuất TSC';
}

/**
 * Câu giải thích cho TCTH biết ý tưởng này đi đường nào — dùng chung cho màn
 * đánh giá và cho tài liệu, để hai nơi không mô tả quy trình bằng hai giọng.
 */
export function duongLenBenRe(capDeXuat: string | null | undefined): {
  duong: 1 | 2;
  ten: string;
  viec: string;
} {
  return canChamPhieuBenRe(capDeXuat)
    ? {
        duong: 1,
        ten: 'Chi nhánh thử nghiệm',
        viec: 'Chấm phiếu 5 câu rồi trình Giám đốc công nhận Bén rễ.',
      }
    : {
        duong: 2,
        ten: 'Trụ sở chính đồng ý',
        viec: 'Khớp trạng thái với phê duyệt của Trụ sở chính ở màn Đối chiếu SMP — không cần qua Giám đốc.',
      };
}
