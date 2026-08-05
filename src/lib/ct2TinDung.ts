/**
 * Kanban Phê duyệt tín dụng (PDTD) — bàn thứ hai, chỉ bật cho phòng có cấp
 * tín dụng (KHDN, Bán lẻ, HTTD…). Đơn vị theo dõi là HỒ SƠ của một khách hàng.
 *
 * Thiết kế dựa trên dữ liệu thật của board Miro PDTD Phòng KHDN (47 hồ sơ):
 * số tiền là SỐ để cộng/lọc được, ngày mỗi loại một cột, «đến hạn GHTD» là
 * trường ngày chứ không phải cột trạng thái, và đúng 01 cán bộ phụ trách.
 *
 * Hàm thuần — kiểm thử được không cần mạng.
 */

import { soNgayLamViec } from './ct2';
import { cauHinhNhip } from './cauHinhNhip';

export type HsTrangThai =
  | 'DEN_HAN_GHTD'
  | 'THU_THAP' | 'TRINH_LDP' | 'TRINH_LDCN' | 'TRINH_TSC'
  | 'HOAN_THIEN_GN' | 'HOAN_THANH' | 'TU_CHOI';

export type HsLoai = 'CAP_MOI' | 'TAI_CAP' | 'DIEU_CHINH' | 'CO_CAU_NO' | 'DU_AN' | 'GIAI_NGAN';
export type HsCap = 'PHONG' | 'CHI_NHANH' | 'TSC';
export type HsKyHan = 'NGAN_HAN' | 'TRUNG_DAI_HAN';

export interface HoSoTinDung {
  id: string;
  phong: string;
  ma_hs: string | null;
  khach_hang: string;
  loai_ho_so: HsLoai;
  /**
   * Đơn vị: TRIỆU ĐỒNG.
   *
   * NULL chỉ có ở hồ sơ nhập từ dữ liệu lịch sử (board Miro có 31/47 hồ sơ
   * không ghi số tiền ở bất kỳ đâu). Hồ sơ mở mới trong ứng dụng luôn có số —
   * trigger `f_ct2_hs_truoc_tao` chặn ở database, không chỉ ở form.
   */
  so_tien: number | null;
  ky_han: HsKyHan | null;
  cap_phe_duyet: HsCap;
  trang_thai: HsTrangThai;
  can_bo: string;
  lanh_dao_theo_doi: string | null;
  /** Ba cấp phụ trách — cùng luật với thẻ Kanban, chỉ lãnh đạo gán được */
  pho_phong: string | null;
  truong_phong: string | null;
  pgd_phu_trach: string | null;
  ngay_nhan: string | null;
  han_xu_ly: string | null;
  ngay_den_han_ghtd: string | null;
  ngay_hoan_thanh: string | null;
  nguoi_dang_giu: string | null;
  giu_tu: string | null;
  nhip_gan_nhat: string | null;
  ly_do_tu_choi: string | null;
  ghi_chu: string | null;
  nguoi_tao: string;
  created_at: string;
  updated_at: string;
}

export interface NhipHoSo {
  id: string;
  ho_so_id: string;
  nguoi_ghi: string;
  buoc: string;
  noi_dung: string;
  vuong_mac: string | null;
  ghi_luc: string;
}

// ---------------------------------------------------------------------------
// Danh mục — đóng, không cho gõ tay (board Miro có "Tái Cấp"/"Tai cap"/"tái cấp")
// ---------------------------------------------------------------------------

export const HS_COT: Array<{ ma: HsTrangThai; ten: string; icon: string }> = [
  // Cột DỰ KIẾN, đứng đầu đường ống. Không phải hồ sơ đang làm — là công việc
  // sắp phải làm, cho trước vào bảng để Phòng thấy khối lượng đang tới.
  { ma: 'DEN_HAN_GHTD', ten: 'Đến hạn GHTD 2 tháng tới', icon: '⏰' },
  { ma: 'THU_THAP', ten: 'Thu thập hồ sơ', icon: '📂' },
  { ma: 'TRINH_LDP', ten: 'Trình Lãnh đạo Phòng', icon: '📤' },
  { ma: 'TRINH_LDCN', ten: 'Trình LĐ Chi nhánh', icon: '🏢' },
  { ma: 'TRINH_TSC', ten: 'Trình cấp PDTD TSC', icon: '🏛️' },
  { ma: 'HOAN_THIEN_GN', ten: 'Hoàn thiện HS giải ngân', icon: '📝' },
  { ma: 'HOAN_THANH', ten: 'Hoàn thành', icon: '✅' },
  { ma: 'TU_CHOI', ten: 'Từ chối / Dừng', icon: '⛔' },
];

export const HS_TEN_LOAI: Record<HsLoai, string> = {
  CAP_MOI: 'Cấp mới GHTD',
  TAI_CAP: 'Tái cấp GHTD',
  DIEU_CHINH: 'Điều chỉnh giới hạn',
  CO_CAU_NO: 'Cơ cấu nợ',
  DU_AN: 'Cho vay dự án / TDH',
  GIAI_NGAN: 'Hồ sơ giải ngân',
};

export const HS_TEN_CAP: Record<HsCap, string> = {
  PHONG: 'Thẩm quyền Phòng',
  CHI_NHANH: 'Thẩm quyền Chi nhánh',
  TSC: 'Trình Trụ sở chính',
};

export const HS_TEN_KY_HAN: Record<HsKyHan, string> = {
  NGAN_HAN: 'Ngắn hạn',
  TRUNG_DAI_HAN: 'Trung dài hạn',
};

/** Ba bước «trình» — hồ sơ nằm trong tay người khác, không phải lỗi cán bộ */
export const HS_BUOC_CHO: HsTrangThai[] = ['TRINH_LDP', 'TRINH_LDCN', 'TRINH_TSC'];

/**
 * Hồ sơ còn đang chạy (vào mẫu số mọi chỉ số).
 *
 * DEN_HAN_GHTD CỐ Ý đứng ngoài: thẻ ở cột dự kiến chưa phải hồ sơ, chưa có số
 * tiền, chưa có hạn xử lý, chưa ai bắt tay làm. Đếm nó vào «hồ sơ đang chạy»
 * hay cộng vào tổng dư nợ đang trình là báo cáo một khối lượng công việc chưa
 * tồn tại — và đòi nó ghi nhịp mỗi ngày thì còn vô lý hơn.
 */
export const HS_DANG_CHAY: HsTrangThai[] =
  ['THU_THAP', 'TRINH_LDP', 'TRINH_LDCN', 'TRINH_TSC', 'HOAN_THIEN_GN'];

/**
 * Ba trường phải có TRƯỚC KHI thẻ dự kiến vào «Thu thập hồ sơ».
 *
 * Đây là hàng rào được DỜI CHỖ, không phải bị gỡ: `f_ct2_hs_truoc_tao` vốn bắt
 * đủ ba thứ này ngay lúc mở hồ sơ. Thẻ dự kiến sinh ra từ một sự thật duy nhất
 * — hạn mức của khách sắp hết — nên lúc đó chưa thể biết vay bao nhiêu, kỳ hạn
 * nào, hẹn xong ngày nào. Bắt điền ngay là ép người ta bịa; bỏ hẳn thì hồ sơ
 * trôi vào đường ống mà không có gì đo được. Nên hỏi đúng lúc bắt tay làm.
 */
export function hsThieuDeVaoThuThap(
  h: Pick<HoSoTinDung, 'so_tien' | 'han_xu_ly' | 'ky_han'>,
): string[] {
  const thieu: string[] = [];
  if (h.so_tien === null) thieu.push('số tiền');
  if (!h.han_xu_ly) thieu.push('hạn xử lý');
  if (!h.ky_han) thieu.push('kỳ hạn');
  return thieu;
}

/**
 * Ngưỡng tuổi cột chờ theo cấp — quy chế Miro §A5 nêu 3–5 ngày làm việc.
 * Trình trong Chi nhánh xử lý nhanh hơn trình lên Trụ sở chính.
 */
export const HS_NGUONG_CHO: Record<string, number> = {
  TRINH_LDP: 2,
  TRINH_LDCN: 3,
  TRINH_TSC: 5,
};

/** Hạn mức sắp đến hạn: cảnh báo trước 60 ngày để kịp mở hồ sơ tái cấp */
export const HS_NGUONG_DEN_HAN = 60;

/**
 * Bao nhiêu NGÀY LÀM VIỆC không ai ghi gì thì coi là hồ sơ «chưa cập nhật».
 *
 * Ngưỡng 2 chứ không phải 3 như cột chờ: hồ sơ tín dụng có tiền của khách và có
 * hạn của khách, im lặng hai ngày làm việc đã là dấu hiệu bỏ quên. Cột chờ đo
 * cấp trên có xử lý không; cái này đo cán bộ có còn bám hồ sơ không.
 */
export const HS_NGUONG_IM_LANG = 2;

/** Ngưỡng im lặng đang áp dụng theo cài đặt của TCTH */
export function hsNguongImLang(): number {
  return cauHinhNhip().nguong_im_lang_ho_so;
}

// ---------------------------------------------------------------------------
// Cổng nhập — hồ sơ tín dụng cần đúng 6 điều, tất cả đều là dữ liệu có cấu trúc
// ---------------------------------------------------------------------------

export interface HsFormTao {
  khach_hang: string;
  loai_ho_so: string;
  /** Chuỗi nhập tay, đơn vị triệu đồng */
  so_tien: string;
  ky_han: string;
  cap_phe_duyet: string;
  can_bo: string;
  han_xu_ly: string;
  ngay_den_han_ghtd: string;
}

export interface HsThieuTruong { truong: string; ten: string; ly_do?: string }

export function kiemTraHoSo(f: HsFormTao): HsThieuTruong[] {
  const thieu: HsThieuTruong[] = [];
  if (f.khach_hang.trim().length < 3) {
    thieu.push({ truong: 'khach_hang', ten: 'Khách hàng', ly_do: 'ghi tên đầy đủ' });
  }
  if (!f.loai_ho_so) thieu.push({ truong: 'loai_ho_so', ten: 'Loại hồ sơ' });
  const tien = docSoTien(f.so_tien);
  if (tien === null || tien <= 0) {
    thieu.push({ truong: 'so_tien', ten: 'Số tiền', ly_do: 'nhập số, đơn vị triệu đồng' });
  }
  if (!f.cap_phe_duyet) thieu.push({ truong: 'cap_phe_duyet', ten: 'Cấp phê duyệt' });
  if (!f.can_bo) {
    thieu.push({ truong: 'can_bo', ten: 'Cán bộ phụ trách', ly_do: 'đúng 01 người' });
  }
  if (!f.han_xu_ly) thieu.push({ truong: 'han_xu_ly', ten: 'Hạn xử lý' });
  return thieu;
}

/**
 * Đọc số tiền người dùng gõ. Chấp nhận "150", "150.000", "150,5" — nhưng
 * KHÔNG chấp nhận "150 tỷ" dạng chữ như board Miro đang làm, vì đơn vị phải
 * thống nhất mới cộng được tổng.
 */
export function docSoTien(s: string): number | null {
  const sach = s.replace(/[.\s]/g, '').replace(',', '.');
  if (!sach || !/^\d+(\.\d+)?$/.test(sach)) return null;
  const n = Number(sach);
  return Number.isFinite(n) ? n : null;
}

/**
 * 150000 (triệu) → "150 tỷ"; 850 → "850 triệu"; thiếu số → "chưa có số tiền".
 *
 * CỐ Ý không trả "0 triệu" khi thiếu: số 0 trông y hệt một con số thật và sẽ
 * lẫn vào tổng dư nợ mà không ai nhận ra.
 */
export function dinhDangTien(trieu: number | null | undefined): string {
  if (trieu === null || trieu === undefined) return 'chưa có số tiền';
  if (trieu >= 1000) {
    const ty = trieu / 1000;
    return `${ty % 1 === 0 ? ty : ty.toFixed(1)} tỷ`;
  }
  return `${trieu} triệu`;
}

// ---------------------------------------------------------------------------
// Luật chuyển bước
// ---------------------------------------------------------------------------

export interface BoiCanhHoSo {
  cap_phe_duyet: HsCap;
  laLanhDao: boolean;
  coLyDoTuChoi: boolean;
  /** Các trường còn thiếu để rời cột dự kiến — xem hsThieuDeVaoThuThap() */
  thieuDeVaoThuThap?: string[];
}

/** null = được chuyển; chuỗi = lý do từ chối (hiện cho người dùng) */
export function lyDoChanChuyenHoSo(tu: HsTrangThai, den: HsTrangThai, bc: BoiCanhHoSo): string | null {
  if (tu === den) return null;

  // Cột dự kiến là điểm XUẤT PHÁT, một chiều.
  //
  // Không cho lùi về: hồ sơ đã vào Thu thập là đã có người bắt tay làm, kéo
  // ngược về «dự kiến» xoá mất sự thật đó và làm đồng hồ xử lý chạy lại từ đầu.
  // Muốn dừng thì có Từ chối/Dừng — cửa đó ghi lý do và giữ vết.
  if (den === 'DEN_HAN_GHTD') {
    return 'Cột «Đến hạn GHTD» là điểm xuất phát — hồ sơ đã bắt đầu không quay lại được. Cần dừng thì dùng Từ chối/Dừng.';
  }
  if (tu === 'DEN_HAN_GHTD') {
    if (den !== 'THU_THAP' && den !== 'TU_CHOI') {
      return 'Từ cột dự kiến chỉ đi sang «Thu thập hồ sơ» — chưa thu thập thì chưa có gì để trình.';
    }
    if (den === 'THU_THAP' && bc.thieuDeVaoThuThap && bc.thieuDeVaoThuThap.length > 0) {
      return `Bắt tay làm thì cần điền ${bc.thieuDeVaoThuThap.join(' · ')} — thẻ dự kiến chưa có các thông tin này.`;
    }
  }

  if (den === 'TRINH_TSC' && bc.cap_phe_duyet !== 'TSC') {
    return `Hồ sơ này thuộc ${HS_TEN_CAP[bc.cap_phe_duyet].toLowerCase()} — không trình lên cấp PDTD Trụ sở chính.`;
  }
  if (den === 'HOAN_THANH' && tu !== 'HOAN_THIEN_GN') {
    return 'Chưa qua bước «Hoàn thiện hồ sơ giải ngân» — không thể chốt Hoàn thành.';
  }
  if (den === 'TU_CHOI') {
    if (!bc.laLanhDao) return 'Chỉ lãnh đạo Phòng được chuyển hồ sơ sang Từ chối/Dừng.';
    if (!bc.coLyDoTuChoi) return 'Từ chối/dừng hồ sơ phải ghi rõ lý do (tối thiểu 20 ký tự).';
  }
  return null;
}

/** Bước kế tiếp hợp lý theo cấp phê duyệt — dùng cho nút «Chuyển bước tiếp» */
export function buocKeTiep(tu: HsTrangThai, cap: HsCap): HsTrangThai | null {
  switch (tu) {
    case 'DEN_HAN_GHTD': return 'THU_THAP';
    case 'THU_THAP': return 'TRINH_LDP';
    case 'TRINH_LDP':
      return cap === 'PHONG' ? 'HOAN_THIEN_GN' : 'TRINH_LDCN';
    case 'TRINH_LDCN':
      return cap === 'TSC' ? 'TRINH_TSC' : 'HOAN_THIEN_GN';
    case 'TRINH_TSC': return 'HOAN_THIEN_GN';
    case 'HOAN_THIEN_GN': return 'HOAN_THANH';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Cảnh báo — bộ kiểm riêng cho board có rủi ro tài chính (quy chế §B4)
// ---------------------------------------------------------------------------

const NGAY_MS = 86_400_000;

function ngayVn(iso: string | Date): number {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const vn = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return Math.floor(new Date(vn.getFullYear(), vn.getMonth(), vn.getDate()).getTime() / NGAY_MS);
}

/**
 * Số ngày quá hạn xử lý (0 = chưa quá). Hồ sơ đã xong/từ chối không tính.
 *
 * CỐ Ý đếm ngày lịch: hạn xử lý là cam kết với khách hàng theo ngày trên lịch,
 * cuối tuần không làm nó bớt trễ. Khác với hsTuoiCho — cái đó đo cơ hội xử lý
 * của một người nên phải trừ ngày nghỉ.
 */
export function hsQuaHan(h: Pick<HoSoTinDung, 'han_xu_ly' | 'trang_thai'>, moc: Date = new Date()): number {
  if (!HS_DANG_CHAY.includes(h.trang_thai) || !h.han_xu_ly) return 0;
  return Math.max(0, ngayVn(moc) - ngayVn(`${h.han_xu_ly}T00:00:00+07:00`));
}

/**
 * Tuổi hồ sơ trong bước trình, tính bằng NGÀY LÀM VIỆC. Quá ngưỡng thì escalate
 * NGƯỜI GIỮ.
 *
 * Ngưỡng HS_NGUONG_CHO (2/3/5) là ngày làm việc theo quy chế Miro §A5, nên đồng
 * hồ cũng phải đếm ngày làm việc. Trình chiều thứ Sáu mà sáng thứ Hai đã báo đỏ
 * «chờ 3 ngày» là oan cho người duyệt — họ chưa có buổi làm việc nào để xử lý.
 */
export function hsTuoiCho(h: Pick<HoSoTinDung, 'trang_thai' | 'giu_tu'>, moc: Date = new Date()): number {
  if (!HS_BUOC_CHO.includes(h.trang_thai) || !h.giu_tu) return 0;
  return soNgayLamViec(h.giu_tu, moc);
}

/** Bước trình đã quá ngưỡng chờ của chính cấp đó chưa */
export function hsNghenCho(h: Pick<HoSoTinDung, 'trang_thai' | 'giu_tu'>, moc: Date = new Date()): boolean {
  const nguong = HS_NGUONG_CHO[h.trang_thai];
  return nguong !== undefined && hsTuoiCho(h, moc) > nguong;
}

/** Số ngày còn lại tới khi hạn mức đến hạn; null nếu không theo dõi hạn mức */
export function hsConLaiDenHan(h: Pick<HoSoTinDung, 'ngay_den_han_ghtd'>, moc: Date = new Date()): number | null {
  if (!h.ngay_den_han_ghtd) return null;
  return ngayVn(`${h.ngay_den_han_ghtd}T00:00:00+07:00`) - ngayVn(moc);
}

/**
 * Số NGÀY LÀM VIỆC hồ sơ không có nhịp mới. Chưa từng ghi nhịp thì tính từ ngày
 * nhận hồ sơ — hồ sơ mở ra rồi bỏ đó là trường hợp cần thấy nhất.
 *
 * Hồ sơ nhập từ dữ liệu lịch sử không có ngày nhận. Khi đó đếm từ `created_at`
 * — ngày hồ sơ vào hệ thống này. Đồng hồ chạy chậm hơn sự thật, nhưng nó là sự
 * thật KIỂM CHỨNG ĐƯỢC: từ hôm vào hệ thống đến nay chưa ai ghi gì.
 */
export function hsNgayImLang(
  h: Pick<HoSoTinDung, 'nhip_gan_nhat' | 'ngay_nhan' | 'trang_thai' | 'created_at'>,
  moc: Date = new Date(),
): number {
  if (!HS_DANG_CHAY.includes(h.trang_thai)) return 0;
  const tu = h.nhip_gan_nhat
    ?? (h.ngay_nhan ? `${h.ngay_nhan}T00:00:00+07:00` : h.created_at);
  if (!tu) return 0;
  return soNgayLamViec(tu, moc);
}

/** Mức «chưa cập nhật» để giao diện chọn màu và biểu tượng */
export type MucImLang = 'MOI' | 'CHAM' | 'BO_QUEN';

/**
 * Hồ sơ này có bị bỏ quên không.
 *
 *  · MOI      — còn trong ngưỡng, không cần báo gì
 *  · CHAM     — quá ngưỡng, nhắc nhẹ
 *  · BO_QUEN  — quá gấp đôi ngưỡng, đây là thứ phải xử lý ngay hôm nay
 */
export function hsMucImLang(
  h: Pick<HoSoTinDung, 'nhip_gan_nhat' | 'ngay_nhan' | 'trang_thai' | 'created_at'>,
  moc: Date = new Date(),
): MucImLang {
  const n = hsNgayImLang(h, moc);
  const nguong = hsNguongImLang();
  if (n >= nguong * 2) return 'BO_QUEN';
  if (n >= nguong) return 'CHAM';
  return 'MOI';
}

/** Hồ sơ chưa từng được ghi nhịp lần nào — mở ra rồi để đó */
export function hsChuaGhiLanNao(h: Pick<HoSoTinDung, 'nhip_gan_nhat'>): boolean {
  return !h.nhip_gan_nhat;
}

/**
 * Ai được sửa SỐ TIỀN của hồ sơ — luật này phải khớp trigger DB
 * `f_ct2_hs_truoc_sua` (hàng rào thật nằm ở đó, đây chỉ là bản chiếu cho
 * giao diện khỏi mời người dùng làm việc sẽ bị chặn):
 *
 *  · Lãnh đạo Phòng: sửa được, kể cả đổi số đã có (mọi lần đổi đều lưu vết).
 *  · Cán bộ phụ trách: chỉ BỔ SUNG được khi đang trống. Điền một sự thật còn
 *    thiếu khác với đổi một con số đã có — 16 hồ sơ nhập từ Miro thiếu số
 *    tiền mà bắt 2 lãnh đạo điền hết thì thành nút cổ chai.
 *
 * Các trường ngày (hạn xử lý, ngày nhận, hạn mức đến hạn) và kỳ hạn thì cán
 * bộ sửa được như thường — không nằm trong nhóm rủi ro tài chính.
 */
export function hsSuaDuocSoTien(
  h: Pick<HoSoTinDung, 'so_tien'>, laLanhDao: boolean,
): boolean {
  return laLanhDao || h.so_tien === null;
}

export interface CanhBaoHoSo { muc: 'DO' | 'VANG'; noi_dung: string }

/**
 * Bộ cảnh báo của một hồ sơ, xếp nặng trước nhẹ sau.
 *
 * Thứ tự ưu tiên theo quy chế §B5: rủi ro tài chính/khách hàng đứng trước
 * trễ hạn cận kề, trước nghẽn, trước thiếu dữ liệu hành chính.
 */
export function canhBaoHoSo(h: HoSoTinDung, moc: Date = new Date()): CanhBaoHoSo[] {
  const ds: CanhBaoHoSo[] = [];
  const conLai = hsConLaiDenHan(h, moc);

  // Nặng nhất: hạn mức của khách hàng sắp hết mà hồ sơ vẫn chưa xong.
  // Thẻ ở cột dự kiến cũng tính — nó SINH RA từ đúng cái hạn này, im lặng ở
  // đây là bỏ trống chỗ duy nhất cảnh báo có nghĩa.
  if (conLai !== null
      && (HS_DANG_CHAY.includes(h.trang_thai) || h.trang_thai === 'DEN_HAN_GHTD')) {
    if (conLai < 0) {
      ds.push({ muc: 'DO', noi_dung: `Hạn mức đã hết ${-conLai} ngày, hồ sơ chưa xong` });
    } else if (conLai <= 30) {
      ds.push({ muc: 'DO', noi_dung: `Hạn mức còn ${conLai} ngày` });
    } else if (conLai <= HS_NGUONG_DEN_HAN) {
      ds.push({ muc: 'VANG', noi_dung: `Hạn mức còn ${conLai} ngày` });
    }
  }

  const quaHan = hsQuaHan(h, moc);
  if (quaHan > 0) ds.push({ muc: 'DO', noi_dung: `Quá hạn xử lý ${quaHan} ngày` });

  if (hsNghenCho(h, moc)) {
    const ten = HS_COT.find((c) => c.ma === h.trang_thai)?.ten ?? h.trang_thai;
    ds.push({ muc: 'DO', noi_dung: `Nằm ở «${ten}» ${hsTuoiCho(h, moc)} ngày — quá ngưỡng ${HS_NGUONG_CHO[h.trang_thai]}` });
  }

  // Bỏ quên: không ai ghi gì suốt nhiều ngày làm việc. Đứng sau các rủi ro về
  // tiền và hạn, nhưng trước phần thiếu dữ liệu hành chính — vì hồ sơ im lặng
  // thường là hồ sơ sắp thành hồ sơ trễ.
  const imLang = hsMucImLang(h, moc);
  if (imLang !== 'MOI') {
    const n = hsNgayImLang(h, moc);
    ds.push({
      muc: imLang === 'BO_QUEN' ? 'DO' : 'VANG',
      noi_dung: hsChuaGhiLanNao(h)
        ? `Chưa cập nhật lần nào (${n} ngày)`
        : `Chưa cập nhật ${n} ngày`,
    });
  }

  // Thiếu dữ liệu hành chính, nhẹ nhất nhưng vẫn phải nêu.
  //
  // Hồ sơ nhập từ board Miro có thể trống số tiền / hạn xử lý / kỳ hạn. Ô trống
  // KHÔNG được im lặng: nếu không nêu ra thì hồ sơ thiếu số tiền trông sạch sẽ
  // y hệt hồ sơ đủ, và tổng dư nợ đang trình thiếu hụt mà không ai biết.
  //
  // Trừ cột dự kiến: ở đó ba ô này TRỐNG LÀ ĐÚNG — chưa bắt tay làm thì chưa
  // biết vay bao nhiêu, kỳ hạn nào, hẹn xong ngày nào. Gắn cờ vàng cho cả cột
  // chỉ dạy người dùng bỏ qua cờ vàng. Chúng được hỏi ở cổng vào Thu thập.
  if (HS_DANG_CHAY.includes(h.trang_thai)) {
    if (h.so_tien === null) {
      ds.push({ muc: 'VANG', noi_dung: 'Chưa có số tiền — hồ sơ này không vào được tổng dư nợ' });
    }
    if (!h.han_xu_ly) {
      ds.push({ muc: 'VANG', noi_dung: 'Chưa có hạn xử lý — không đo được đúng hẹn hay trễ' });
    }
    if (!h.ky_han) {
      ds.push({ muc: 'VANG', noi_dung: 'Chưa ghi kỳ hạn (ngắn hạn / trung dài hạn)' });
    }
    if (!h.ngay_den_han_ghtd
        && (h.loai_ho_so === 'TAI_CAP' || h.loai_ho_so === 'DIEU_CHINH')) {
      ds.push({ muc: 'VANG', noi_dung: 'Hồ sơ tái cấp/điều chỉnh nhưng chưa ghi ngày hạn mức đến hạn' });
    }
  }
  return ds;
}

/**
 * Tổng dư nợ đang trình theo từng bước — chỉ tính được vì số tiền là SỐ.
 *
 * `thieu` đếm số hồ sơ KHÔNG có số tiền. Con số này phải đi kèm tổng, nếu
 * không thì "tổng 480 tỷ" đọc như đã bao gồm tất cả, trong khi có thể còn 6
 * hồ sơ chưa ai khai số.
 */
export function tongTheoBuoc(
  ds: HoSoTinDung[],
): Map<HsTrangThai, { so: number; tien: number; thieu: number }> {
  const m = new Map<HsTrangThai, { so: number; tien: number; thieu: number }>();
  for (const h of ds) {
    const cu = m.get(h.trang_thai) ?? { so: 0, tien: 0, thieu: 0 };
    m.set(h.trang_thai, {
      so: cu.so + 1,
      tien: cu.tien + (h.so_tien ?? 0),
      thieu: cu.thieu + (h.so_tien === null ? 1 : 0),
    });
  }
  return m;
}

/**
 * MỘT KHÁCH — MỘT CHỖ trên bàn: giấu hồ sơ ĐÃ ĐÓNG của khách hàng đang còn
 * một hồ sơ/thẻ khác mở.
 *
 * Giám đốc chỉ ra Công ty CP Nhựa Tuệ Minh vừa nằm ở «Hoàn thành» vừa nằm ở
 * «Đến hạn GHTD». Hai bản ghi này KHÔNG trùng nhau — một là hạn mức cũ đã cấp
 * xong, một là việc tái cấp sắp phải làm — nhưng trên bảng thì người đọc thấy
 * cùng một cái tên hai chỗ, và đó đúng là điều phải hết.
 *
 * Đây không phải hậu quả của đợt gieo thẻ dự kiến: 4 cặp đã trùng từ trước
 * (Phú Thái, Thaicom, Mỹ Hương, Hưng Phát — hoàn thành + hồ sơ mới đang chạy).
 * Gốc là bàn giữ hồ sơ hoàn thành trên bảng mãi mãi, nên khách nào có lịch sử
 * cộng với việc đang làm đều hiện hai lần.
 *
 * Luật giấu: hồ sơ đã đóng (Hoàn thành / Từ chối) lui khỏi bảng KHI VÀ CHỈ KHI
 * khách đó còn một thẻ chưa đóng. Không xoá gì — bản ghi vẫn nguyên trong
 * database và vẫn tra được; chỉ là bàn điều hành nói về việc đang sống. Khách
 * không còn việc gì mở thì hồ sơ hoàn thành vẫn nằm đó làm thành quả của Phòng.
 */
export function locTrungKhachHang(ds: HoSoTinDung[]): HoSoTinDung[] {
  const coTheMo = new Set(
    ds.filter((h) => h.trang_thai !== 'HOAN_THANH' && h.trang_thai !== 'TU_CHOI')
      .map((h) => `${h.phong}|${h.khach_hang.trim().toLowerCase()}`),
  );
  return ds.filter((h) => {
    if (h.trang_thai !== 'HOAN_THANH' && h.trang_thai !== 'TU_CHOI') return true;
    return !coTheMo.has(`${h.phong}|${h.khach_hang.trim().toLowerCase()}`);
  });
}

/**
 * Xếp hồ sơ trong một cột: hồ sơ rủi ro nhất lên trước.
 * Cùng mức rủi ro thì hồ sơ TO hơn lên trước — tiền lớn hỏng thì đau hơn.
 */
export function sapXepHoSo(ds: HoSoTinDung[], moc: Date = new Date()): HoSoTinDung[] {
  const diem = (h: HoSoTinDung) => {
    const cb = canhBaoHoSo(h, moc);
    if (cb.some((c) => c.muc === 'DO')) return 0;
    if (cb.length > 0) return 1;
    return 2;
  };
  return [...ds].sort((a, b) => {
    const d = diem(a) - diem(b);
    if (d !== 0) return d;
    // Hồ sơ thiếu số tiền xếp như 0 — xuống cuối nhóm, không giả vờ là hồ sơ nhỏ
    const ta = a.so_tien ?? 0;
    const tb = b.so_tien ?? 0;
    if (ta !== tb) return tb - ta;
    // Thiếu hạn thì xếp sau hồ sơ có hạn (chuỗi rỗng đứng trước nên đảo dấu)
    if (!a.han_xu_ly || !b.han_xu_ly) return (a.han_xu_ly ? 0 : 1) - (b.han_xu_ly ? 0 : 1);
    return a.han_xu_ly.localeCompare(b.han_xu_ly);
  });
}

/** Bảng này chưa có trong database — migration chưa được áp */
export function laLoiThieuBangPdtd(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '')
    || /Could not find the (function|table)/i.test(error.message ?? '');
}
