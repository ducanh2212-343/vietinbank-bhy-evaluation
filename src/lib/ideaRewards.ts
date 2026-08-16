import { IDEA_DEV_LEVELS, type IdeaDevLevel } from '@/data/one/ideasConfig';

// Cơ chế thưởng BHY Ideas — nguyên tắc LŨY KẾ (chốt vận hành 08/2026).
//
// Vì sao đổi: bản cũ suy tiền thưởng từ cấp độ HIỆN TẠI của ý tưởng nhân đơn
// giá một cấp. Cách đó sai ở hai đầu:
//   - Ý tưởng vượt cấp (chưa qua Ươm mầm/Bén rễ đã được xét thẳng Vươn cành)
//     chỉ nhận đúng một mức, trong khi công sức đi qua cả chặng.
//   - Mọi ý tưởng vừa gửi đều mặc định 'Ươm mầm' nên dự toán tính tiền cho cả
//     ý tưởng phòng CHƯA chọn — thổi phồng ngân sách.
//
// Nguyên tắc mới, áp cho MỌI cấp và MỌI trường hợp: tiền thưởng của một lần
// công nhận = tổng đơn giá các cấp TỪ ĐẦU ĐẾN CẤP ĐƯỢC CÔNG NHẬN mà ý tưởng
// CHƯA từng được thưởng. Nhờ vậy:
//   - đi tuần tự từng cấp: mỗi lần nhận đúng một mức (như cũ);
//   - vượt cấp: nhận gộp các mức bỏ qua — không thiệt cho người làm tốt;
//   - không bao giờ trả trùng một cấp (sổ thưởng khóa theo ý tưởng × cấp).

export const CAC_CAP: readonly IdeaDevLevel[] = IDEA_DEV_LEVELS;

/** Đơn giá từng cấp (mục 6 quy chế) — Lan tỏa là khoảng, Hội đồng chọn trong khoảng */
export interface DonGia {
  min: number;
  max: number;
}

export const DON_GIA_CAP: Record<IdeaDevLevel, DonGia> = {
  'Ươm mầm': { min: 100_000, max: 100_000 },
  'Bén rễ': { min: 300_000, max: 300_000 },
  'Vươn cành': { min: 1_000_000, max: 1_000_000 },
  'Lan tỏa': { min: 2_000_000, max: 3_000_000 },
};

/** Thứ hạng của cấp (0 = Ươm mầm … 3 = Lan tỏa); -1 nếu không hợp lệ */
export function thuHangCap(cap: IdeaDevLevel): number {
  return CAC_CAP.indexOf(cap);
}

export interface KetQuaLuyKe {
  /** Các cấp được thưởng trong lần công nhận này (đã loại cấp từng thưởng) */
  cacCapDuocThuong: IdeaDevLevel[];
  min: number;
  max: number;
  /** Có vượt cấp không (được thưởng từ 2 cấp trở lên trong một lần) */
  laVuotCap: boolean;
}

/**
 * Tiền thưởng LŨY KẾ khi công nhận ý tưởng lên `capMoi`.
 *
 * @param daThuong Các cấp ý tưởng ĐÃ từng được thưởng (đọc từ sổ thưởng)
 * @param capMoi   Cấp vừa được công nhận
 *
 * Cấp cao hơn `capMoi` mà đã thưởng (trường hợp hi hữu do sửa tay) không bị
 * đụng tới — hàm chỉ xét khoảng từ đầu đến `capMoi`.
 */
export function thuongLuyKe(daThuong: readonly IdeaDevLevel[], capMoi: IdeaDevLevel): KetQuaLuyKe {
  const dich = thuHangCap(capMoi);
  if (dich < 0) return { cacCapDuocThuong: [], min: 0, max: 0, laVuotCap: false };

  const daCo = new Set(daThuong);
  const cacCapDuocThuong = CAC_CAP.slice(0, dich + 1).filter(c => !daCo.has(c));
  const min = cacCapDuocThuong.reduce((s, c) => s + DON_GIA_CAP[c].min, 0);
  const max = cacCapDuocThuong.reduce((s, c) => s + DON_GIA_CAP[c].max, 0);
  return { cacCapDuocThuong, min, max, laVuotCap: cacCapDuocThuong.length > 1 };
}

/** Diễn giải tiền: một số hoặc khoảng, đơn vị đồng */
export function dienGiaiTien(min: number, max: number): string {
  const f = (n: number) => n.toLocaleString('vi-VN');
  return min === max ? `${f(min)}đ` : `${f(min)}–${f(max)}đ`;
}

// ---------------------------------------------------------------------------
// THỜI GIAN THỂ HIỆN KẾT QUẢ — cấp càng cao càng cần thời gian chứng minh
// ---------------------------------------------------------------------------

/**
 * Số ngày tối thiểu kể từ mốc gần nhất (lần công nhận trước, hoặc ngày gửi ý
 * tưởng nếu chưa được công nhận cấp nào) trước khi được xét cấp này.
 *
 * Căn cứ: Phụ lục 05 quy định phiếu pilot 30–60 ngày → Vươn cành ("đã áp
 * dụng/pilot, có bằng chứng kết quả") đòi tối thiểu 30 ngày. Lan tỏa ("được
 * nhân rộng, chuẩn hóa") cần thêm thời gian lan ra đơn vị khác → 60 ngày.
 * Ươm mầm và Bén rễ không đặt mốc thời gian: đây là hai bước sàng lọc trên
 * giấy, chưa đòi bằng chứng vận hành.
 */
export const NGAY_TOI_THIEU_TRUOC_KHI_XET: Record<IdeaDevLevel, number> = {
  'Ươm mầm': 0,
  'Bén rễ': 0,
  'Vươn cành': 30,
  'Lan tỏa': 60,
};

export interface KetQuaThoiGian {
  dat: boolean;
  soNgayDaQua: number;
  soNgayCanThem: number;
  /** Câu giải thích cho người xét — rỗng khi đạt */
  canhBao: string;
}

const MOT_NGAY = 24 * 60 * 60 * 1000;

/**
 * Kiểm tra ý tưởng đã "chín" đủ thời gian để xét `capMoi` chưa.
 *
 * @param mocGanNhat Mốc tính thời gian: ngày công nhận cấp liền trước, hoặc
 *                   ngày gửi ý tưởng khi vượt cấp từ đầu.
 */
export function kiemTraThoiGian(
  capMoi: IdeaDevLevel,
  mocGanNhat: Date | string,
  homNay: Date | string = new Date(),
): KetQuaThoiGian {
  const canCo = NGAY_TOI_THIEU_TRUOC_KHI_XET[capMoi] ?? 0;
  const tu = new Date(mocGanNhat).getTime();
  const den = new Date(homNay).getTime();
  const soNgayDaQua = Math.max(0, Math.floor((den - tu) / MOT_NGAY));
  const soNgayCanThem = Math.max(0, canCo - soNgayDaQua);
  return {
    dat: soNgayCanThem === 0,
    soNgayDaQua,
    soNgayCanThem,
    canhBao: soNgayCanThem === 0
      ? ''
      : `Cấp độ ${capMoi} cần tối thiểu ${canCo} ngày thể hiện kết quả — ý tưởng mới qua ${soNgayDaQua} ngày, còn thiếu ${soNgayCanThem} ngày.`,
  };
}

// ---------------------------------------------------------------------------
// TRẦN ƯƠM MẦM — khuyến khích nêu ý tưởng, nhưng chỉ thưởng trong hạn mức
// ---------------------------------------------------------------------------

/**
 * Tối đa 02 ý tưởng/tuần/phòng được thưởng Ươm mầm (mục 5 quy chế: "phòng chọn
 * tối đa 02 ý tưởng/tuần").
 *
 * Lưu ý thiết kế: trần đếm theo LẦN PHÒNG CHỌN, không theo ngày gửi phiếu.
 * Cán bộ vẫn gửi ý tưởng thoải mái — gửi bao nhiêu cũng được ghi nhận và hiện
 * trên bảng theo dõi; chỉ việc "phòng chọn để thưởng" mới bị giới hạn.
 */
export const TRAN_UOM_MAM_MOI_TUAN = 2;

/**
 * MỐC HỒI TỐ (chỉ đạo 08/2026): ý tưởng Ươm mầm tự đề xuất gửi TRƯỚC mốc này
 * đều được thưởng tiền để khuyến khích phong trào, kể cả khi không nằm trong
 * hạn mức ghi nhận. Từ mốc trở đi, chỉ ý tưởng được Trưởng phòng chọn trong
 * hạn mức mới có tiền.
 *
 * GHI NHẬN cho KPI thì KHÔNG hồi tố — luôn theo đúng hạn mức 02/tuần/phòng,
 * để KPI đo lường chuẩn.
 */
export const MOC_HOI_TO_THUONG = '2026-08-16';

export type LyDoThuong = 'trong_han_muc' | 'hoi_to_khuyen_khich' | 'khong_chi' | 'chuyen_ky_sau';

export const LY_DO_THUONG_LABELS: Record<LyDoThuong, string> = {
  trong_han_muc: 'Trong hạn mức — thưởng theo quy chế',
  hoi_to_khuyen_khich: 'Ngoài hạn mức, gửi trước 16/08/2026 — thưởng khuyến khích',
  khong_chi: 'Ngoài hạn mức — không chi thưởng',
  chuyen_ky_sau: 'Hết ngân sách kỳ này — chuyển kỳ xét sau',
};

export interface KetQuaThuongUomMam {
  muc: number;
  lyDo: LyDoThuong;
  /** Có tính vào KPI Đổi mới sáng tạo không — chỉ khi nằm trong hạn mức */
  ghiNhanKpi: boolean;
}

/**
 * Tiền thưởng và tư cách ghi nhận của một ý tưởng ở cấp Ươm mầm.
 *
 * @param ngayGui    Ngày gửi ý tưởng
 * @param trongHanMuc Trưởng phòng có chọn ý tưởng này vào hạn mức tuần không
 */
export function thuongUomMam(
  ngayGui: Date | string,
  trongHanMuc: boolean,
): KetQuaThuongUomMam {
  const donGia = DON_GIA_CAP['Ươm mầm'].min;
  if (trongHanMuc) {
    return { muc: donGia, lyDo: 'trong_han_muc', ghiNhanKpi: true };
  }
  // Neo mốc theo NỬA ĐÊM GIỜ ĐỊA PHƯƠNG: 'yyyy-mm-dd' trần được JS hiểu là
  // nửa đêm UTC, lệch 7 tiếng so với giờ Việt Nam và làm sai biên ngày.
  const truocMoc = new Date(ngayGui).getTime() < new Date(`${MOC_HOI_TO_THUONG}T00:00:00`).getTime();
  return truocMoc
    ? { muc: donGia, lyDo: 'hoi_to_khuyen_khich', ghiNhanKpi: false }
    : { muc: 0, lyDo: 'khong_chi', ghiNhanKpi: false };
}

export interface SuatUomMam {
  daDung: number;
  conLai: number;
  het: boolean;
}

/**
 * @param tran Trần của tuần — mặc định lấy theo quy chế, truyền vào khi đọc từ
 *             bảng cấu hình `bhy_ideas_cau_hinh` (TCTH đổi được không cần sửa mã).
 */
export function suatUomMamConLai(
  daChonTrongTuan: number,
  tran: number = TRAN_UOM_MAM_MOI_TUAN,
): SuatUomMam {
  const daDung = Math.max(0, daChonTrongTuan);
  const conLai = Math.max(0, tran - daDung);
  return { daDung, conLai, het: conLai === 0 };
}

/** Thứ Hai của tuần chứa `ngay` (giờ VN) — khóa đếm trần theo tuần */
export function dauTuan(ngay: Date | string): string {
  const d = new Date(ngay);
  const thu = (d.getDay() + 6) % 7; // 0 = thứ Hai
  d.setDate(d.getDate() - thu);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// NGÂN SÁCH CHU KỲ
// ---------------------------------------------------------------------------

/** Tổng ngân sách chương trình cho chu kỳ 01/06/2026 – 31/12/2026 (mục 6) */
export const NGAN_SACH_CHU_KY = 100_000_000;

/** Ngưỡng cảnh báo sớm — chạm mức này thì TCTH phải báo cáo BGĐ trước khi duyệt tiếp */
export const NGUONG_CANH_BAO = 0.8;

export interface TinhHinhNganSach {
  tong: number;
  daChi: number;
  choDuyet: number;
  /** Còn lại sau khi trừ cả phần đang chờ duyệt */
  conLai: number;
  tyLeDaDung: number;
  sapHet: boolean;
  vuotTran: boolean;
  canhBao: string;
}

/**
 * Tình hình ngân sách. `choDuyet` là phần đã đề nghị nhưng chưa duyệt — tính
 * vào phần đã cam kết để không duyệt lố rồi mới biết.
 *
 * Quy chế cho phép xử lý mềm khi vượt: "Phòng TCTH tổng hợp, báo cáo Ban Giám
 * đốc/Hội đồng Thi đua - Khen thưởng xem xét quyết định. Các ý tưởng vẫn được
 * ghi nhận/vinh danh và có thể chuyển sang kỳ xét thưởng tiếp theo." — nên hàm
 * này CẢNH BÁO chứ không chặn cứng.
 */
export function tinhHinhNganSach(
  daChi: number,
  choDuyet = 0,
  tong = NGAN_SACH_CHU_KY,
): TinhHinhNganSach {
  const daCamKet = daChi + choDuyet;
  const conLai = tong - daCamKet;
  const tyLeDaDung = tong > 0 ? daCamKet / tong : 0;
  const vuotTran = conLai < 0;
  const sapHet = !vuotTran && tyLeDaDung >= NGUONG_CANH_BAO;
  let canhBao = '';
  if (vuotTran) {
    canhBao = `Vượt ngân sách ${dienGiaiTien(-conLai, -conLai)} — TCTH tổng hợp báo cáo Ban Giám đốc/Hội đồng TĐKT quyết định, hoặc chuyển ý tưởng sang kỳ xét sau.`;
  } else if (sapHet) {
    canhBao = `Đã cam kết ${Math.round(tyLeDaDung * 100)}% ngân sách, còn ${dienGiaiTien(conLai, conLai)} — cân nhắc trước khi duyệt thêm.`;
  }
  return { tong, daChi, choDuyet, conLai, tyLeDaDung, sapHet, vuotTran, canhBao };
}

/**
 * Kiểm tra trước khi duyệt một khoản thưởng: còn đủ ngân sách không.
 * Trả về cảnh báo để hiện cho người duyệt, KHÔNG chặn (quyết định thuộc BGĐ).
 */
export function kiemTraTruocKhiDuyet(
  soTienDuKien: number,
  daChi: number,
  choDuyet = 0,
  tong = NGAN_SACH_CHU_KY,
): { du: boolean; canhBao: string } {
  const conLai = tong - daChi - choDuyet;
  if (soTienDuKien <= conLai) return { du: true, canhBao: '' };
  return {
    du: false,
    canhBao: `Khoản này ${dienGiaiTien(soTienDuKien, soTienDuKien)} vượt phần ngân sách còn lại ${dienGiaiTien(Math.max(0, conLai), Math.max(0, conLai))}. Quy chế cho phép ghi nhận/vinh danh và chuyển sang kỳ xét sau, hoặc báo cáo Ban Giám đốc quyết định.`,
  };
}
