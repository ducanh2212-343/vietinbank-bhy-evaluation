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

export type HsTrangThai =
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
  /** Đơn vị: TRIỆU ĐỒNG */
  so_tien: number;
  ky_han: HsKyHan;
  cap_phe_duyet: HsCap;
  trang_thai: HsTrangThai;
  can_bo: string;
  lanh_dao_theo_doi: string | null;
  ngay_nhan: string;
  han_xu_ly: string;
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

/** Hồ sơ còn đang chạy (vào mẫu số mọi chỉ số) */
export const HS_DANG_CHAY: HsTrangThai[] =
  ['THU_THAP', 'TRINH_LDP', 'TRINH_LDCN', 'TRINH_TSC', 'HOAN_THIEN_GN'];

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

/** 150000 (triệu) → "150 tỷ"; 850 → "850 triệu" */
export function dinhDangTien(trieu: number): string {
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
}

/** null = được chuyển; chuỗi = lý do từ chối (hiện cho người dùng) */
export function lyDoChanChuyenHoSo(tu: HsTrangThai, den: HsTrangThai, bc: BoiCanhHoSo): string | null {
  if (tu === den) return null;
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
  if (!HS_DANG_CHAY.includes(h.trang_thai)) return 0;
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

  // Nặng nhất: hạn mức của khách hàng sắp hết mà hồ sơ vẫn chưa xong
  if (conLai !== null && HS_DANG_CHAY.includes(h.trang_thai)) {
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

  // Thiếu dữ liệu hành chính, nhẹ nhất nhưng vẫn phải nêu
  if (HS_DANG_CHAY.includes(h.trang_thai) && !h.ngay_den_han_ghtd
      && (h.loai_ho_so === 'TAI_CAP' || h.loai_ho_so === 'DIEU_CHINH')) {
    ds.push({ muc: 'VANG', noi_dung: 'Hồ sơ tái cấp/điều chỉnh nhưng chưa ghi ngày hạn mức đến hạn' });
  }
  return ds;
}

/** Tổng dư nợ đang trình theo từng bước — chỉ tính được vì số tiền là SỐ */
export function tongTheoBuoc(ds: HoSoTinDung[]): Map<HsTrangThai, { so: number; tien: number }> {
  const m = new Map<HsTrangThai, { so: number; tien: number }>();
  for (const h of ds) {
    const cu = m.get(h.trang_thai) ?? { so: 0, tien: 0 };
    m.set(h.trang_thai, { so: cu.so + 1, tien: cu.tien + h.so_tien });
  }
  return m;
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
    if (a.so_tien !== b.so_tien) return b.so_tien - a.so_tien;
    return a.han_xu_ly.localeCompare(b.han_xu_ly);
  });
}

/** Bảng này chưa có trong database — migration chưa được áp */
export function laLoiThieuBangPdtd(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '')
    || /Could not find the (function|table)/i.test(error.message ?? '');
}
