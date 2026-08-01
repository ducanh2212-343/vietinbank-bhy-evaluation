/**
 * Chiêu thức 2 — Kanban 5W2H + PDCA (đặc tả v1.0, 01/08/2026).
 *
 * Toàn bộ luật nghiệp vụ phía client nằm ở đây dưới dạng HÀM THUẦN, kiểm thử
 * được không cần mạng hay React. Database có bộ trigger chặn tương đương —
 * client chặn để trải nghiệm tốt, server chặn để dữ liệu không thể sai.
 */

export type Ct2TrangThai =
  | 'CHUAN_BI' | 'DANG_LAM' | 'CHO_PHOI_HOP' | 'CHO_DUYET'
  | 'HOAN_THANH' | 'DA_DONG' | 'DUNG_HUY';
export type Ct2Co = 'XANH' | 'VANG' | 'DO';
export type Ct2NhanPdca = 'P' | 'D' | 'C' | 'A';
export type Ct2Loai = 'TIEN_TRINH' | 'THUONG_TRUC';
export type Ct2UuTien = 'THUONG' | 'UU_TIEN' | 'TRONG_DIEM_BGD';

export interface Ct2DauViec {
  id: string;
  cycle_id: string | null;
  chien_dich_id: string | null;
  ma_hien_thi: string | null;
  tieu_de: string;
  ket_qua_dau_ra: string;
  muc_tieu_lien_ket: string;
  cach_lam: string;
  chi_tieu_dinh_luong: number | null;
  don_vi: string | null;
  nguon_luc_du_kien: string | null;
  nguoi_chiu_trach_nhiem: string;
  nguoi_phoi_hop: string[];
  lanh_dao_theo_doi: string;
  phong: string;
  pham_vi: 'PHONG' | 'PGD' | 'CHI_NHANH';
  loai_dau_viec: Ct2Loai;
  lien_phong: boolean;
  cac_phong_tham_gia: string[];
  muc_uu_tien: Ct2UuTien;
  trang_thai: Ct2TrangThai;
  phan_tram: number;
  co_tinh_trang: Ct2Co;
  ngay_bat_dau: string;
  han_hoan_thanh: string;
  han_goc: string | null;
  ly_do_dung_huy: string | null;
  nguoi_dang_giu: string | null;
  giu_tu: string | null;
  nhip_gan_nhat: string | null;
  nguoi_tao: string;
  created_at: string;
  updated_at: string;
}

export interface Ct2Nhip {
  id: string;
  dau_viec_id: string;
  nguoi_ghi: string;
  nhan_pdca: Ct2NhanPdca;
  noi_dung: string;
  vuong_mac: string | null;
  hanh_dong_hom_nay: string | null;
  co_tinh_trang: Ct2Co;
  phan_tram: number;
  ghi_luc: string;
  dung_nhip: 'DUNG_GIO' | 'MUON' | 'MAT_NHIP' | 'KHONG_TINH';
}

export interface Ct2BinhLuan {
  id: string;
  pham_vi: 'DAU_VIEC' | 'PHONG' | 'CHIEN_DICH';
  doi_tuong_id: string;
  cha_id: string | null;
  nguoi_gui: string;
  noi_dung: string;
  nhac_ten: string[];
  can_tra_loi: boolean;
  da_tra_loi_luc: string | null;
  ghim: boolean;
  thu_hoi: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Cột Kanban chuẩn toàn Chi nhánh (đặc tả §4.1)
// ---------------------------------------------------------------------------

export const CT2_COT: Array<{ ma: Ct2TrangThai; ten: string; icon: string }> = [
  { ma: 'CHUAN_BI', ten: 'Chuẩn bị', icon: '📋' },
  { ma: 'DANG_LAM', ten: 'Đang làm', icon: '🔨' },
  { ma: 'CHO_PHOI_HOP', ten: 'Chờ phối hợp', icon: '🤝' },
  { ma: 'CHO_DUYET', ten: 'Chờ ý kiến / duyệt', icon: '⏳' },
  { ma: 'HOAN_THANH', ten: 'Hoàn thành', icon: '✅' },
  { ma: 'DA_DONG', ten: 'Đã đóng', icon: '📦' },
  { ma: 'DUNG_HUY', ten: 'Dừng/Hủy', icon: '⛔' },
];

export const CT2_TEN_CO: Record<Ct2Co, string> = {
  XANH: '🟢 Đúng hẹn', VANG: '🟡 Có rủi ro', DO: '🔴 Đang vướng',
};

export const CT2_TEN_NHAN: Record<Ct2NhanPdca, string> = {
  P: 'P — Plan (lập/điều chỉnh cách làm)',
  D: 'D — Do (việc đã thực hiện)',
  C: 'C — Check (đối chiếu với chỉ tiêu)',
  A: 'A — Act (bài học, chuẩn hóa)',
};

export const CT2_TEN_UU_TIEN: Record<Ct2UuTien, string> = {
  THUONG: 'Thường', UU_TIEN: 'Ưu tiên', TRONG_DIEM_BGD: '⭐ Trọng điểm BGĐ',
};

/** Trạng thái được tính là "còn chạy" — có mặt trên Kanban hoạt động */
export const CT2_TRANG_THAI_CHAY: Ct2TrangThai[] =
  ['CHUAN_BI', 'DANG_LAM', 'CHO_PHOI_HOP', 'CHO_DUYET'];

/** Ngưỡng WIP mặc định (TCTH cấu hình được): 4 thẻ "Đang làm"/người */
export const CT2_NGUONG_WIP = 4;

/** Tuổi tối đa cột chờ trước khi escalate: 3 ngày làm việc */
export const CT2_NGUONG_TUOI_CHO = 3;

/** Bộ cảm xúc rút gọn cho bình luận (cố ý giới hạn — đặc tả §8.3) */
export const CT2_CAM_XUC = ['👍', '✅', '👀', '🎯', '🙏', '❤️', '🔥'] as const;

// ---------------------------------------------------------------------------
// Cổng A — kiểm tra 5W2H lúc TẠO (chặn cứng, đặc tả §3.1)
// ---------------------------------------------------------------------------

export interface Ct2FormTao {
  tieu_de: string;
  ket_qua_dau_ra: string;
  muc_tieu_lien_ket: string;
  cach_lam: string;
  chi_tieu_dinh_luong: string;   // chuỗi nhập tay, có thể rỗng với việc không có số
  co_chi_tieu_so: boolean;
  don_vi: string;
  nguoi_chiu_trach_nhiem: string;
  lanh_dao_theo_doi: string;
  phong: string;
  pham_vi: string;
  loai_dau_viec: string;
  ngay_bat_dau: string;
  han_hoan_thanh: string;
  lien_phong: boolean;
  cac_phong_tham_gia: string[];
}

/** Các chuỗi tiêu đề rỗng nghĩa bị chặn (đặc tả 2.3 — "theo dõi", "làm việc") */
const TIEU_DE_RONG_NGHIA = ['theo dõi', 'theo doi', 'làm việc', 'lam viec', 'xử lý', 'xu ly', 'triển khai', 'trien khai'];

export interface Ct2ThieuTruong { truong: keyof Ct2FormTao; ten: string; ly_do?: string }

/**
 * Trả về danh sách trường còn thiếu/không hợp lệ. Rỗng = đủ điều kiện tạo.
 * Nút "Tạo đầu việc" disabled chừng nào danh sách này chưa rỗng.
 */
export function kiemTraCongA(f: Ct2FormTao): Ct2ThieuTruong[] {
  const thieu: Ct2ThieuTruong[] = [];
  const tieuDe = f.tieu_de.trim();
  if (tieuDe.length < 10) {
    thieu.push({ truong: 'tieu_de', ten: 'Tên đầu việc', ly_do: 'tối thiểu 10 ký tự' });
  } else if (TIEU_DE_RONG_NGHIA.includes(tieuDe.toLowerCase())) {
    thieu.push({ truong: 'tieu_de', ten: 'Tên đầu việc', ly_do: 'tên quá chung chung — ghi rõ làm gì, cho ai' });
  }
  if (f.ket_qua_dau_ra.trim().length < 5) {
    thieu.push({ truong: 'ket_qua_dau_ra', ten: 'Kết quả đầu ra', ly_do: 'làm xong thì có cái gì?' });
  }
  if (!f.muc_tieu_lien_ket.trim()) {
    thieu.push({ truong: 'muc_tieu_lien_ket', ten: 'Mục tiêu liên kết' });
  }
  if (f.cach_lam.trim().length < 30) {
    thieu.push({ truong: 'cach_lam', ten: 'Cách làm', ly_do: 'tối thiểu 30 ký tự — các bước triển khai' });
  }
  if (f.co_chi_tieu_so) {
    if (!f.chi_tieu_dinh_luong.trim() || Number.isNaN(Number(f.chi_tieu_dinh_luong))) {
      thieu.push({ truong: 'chi_tieu_dinh_luong', ten: 'Chỉ tiêu định lượng', ly_do: 'nhập con số' });
    }
    if (!f.don_vi.trim()) thieu.push({ truong: 'don_vi', ten: 'Đơn vị chỉ tiêu' });
  }
  if (!f.nguoi_chiu_trach_nhiem) {
    thieu.push({ truong: 'nguoi_chiu_trach_nhiem', ten: 'Người chịu trách nhiệm', ly_do: 'duy nhất 01 người, không để «gán sau»' });
  }
  if (!f.lanh_dao_theo_doi) thieu.push({ truong: 'lanh_dao_theo_doi', ten: 'Lãnh đạo theo dõi' });
  if (!f.phong) thieu.push({ truong: 'phong', ten: 'Phòng chủ trì' });
  if (!f.pham_vi) thieu.push({ truong: 'pham_vi', ten: 'Phạm vi' });
  if (!f.loai_dau_viec) thieu.push({ truong: 'loai_dau_viec', ten: 'Loại đầu việc' });
  if (!f.ngay_bat_dau) thieu.push({ truong: 'ngay_bat_dau', ten: 'Ngày bắt đầu' });
  if (!f.han_hoan_thanh) {
    thieu.push({ truong: 'han_hoan_thanh', ten: 'Hạn hoàn thành' });
  } else if (f.ngay_bat_dau && f.han_hoan_thanh < f.ngay_bat_dau) {
    thieu.push({ truong: 'han_hoan_thanh', ten: 'Hạn hoàn thành', ly_do: 'phải sau ngày bắt đầu' });
  }
  if (f.lien_phong && f.cac_phong_tham_gia.length === 0) {
    thieu.push({ truong: 'cac_phong_tham_gia', ten: 'Các phòng tham gia', ly_do: 'việc liên phòng cần chọn phòng phối hợp' });
  }
  return thieu;
}

/** Tổng số trường bắt buộc của Cổng A — dùng cho thanh "8/11 trường" */
export function demTruongCongA(f: Ct2FormTao): { du: number; tong: number } {
  // 11 trường nền + 2 khi có chỉ tiêu số (con số + đơn vị) + 1 khi liên phòng
  const tong = 11 + (f.co_chi_tieu_so ? 2 : 0) + (f.lien_phong ? 1 : 0);
  const thieu = kiemTraCongA(f).length;
  return { du: Math.max(0, tong - thieu), tong };
}

// ---------------------------------------------------------------------------
// Cổng B — câu nhịp hằng ngày (nhẹ nhưng chống "điền cho có", đặc tả §3.2)
// ---------------------------------------------------------------------------

/** Danh sách chặn câu nhịp vô nghĩa */
const CAU_NHIP_CHAN = ['ok', 'đang làm', 'dang lam', 'bình thường', 'binh thuong', 'vẫn thế', 'van the', 'đang triển khai', 'dang trien khai'];

export interface KetQuaKiemNhip { hopLe: boolean; loi: string | null }

export function kiemTraCauNhip(input: {
  noiDung: string;
  co: Ct2Co;
  vuongMac: string;
  hanhDongHomNay: string;
  /** Câu nhịp gần nhất của chính đầu việc này — chống copy-paste */
  cauGanNhat: string | null;
}): KetQuaKiemNhip {
  const cau = input.noiDung.trim();
  if (cau.length < 15) {
    return { hopLe: false, loi: 'Câu nhịp cần tối thiểu 15 ký tự — ghi rõ đã làm gì, tới đâu.' };
  }
  if (CAU_NHIP_CHAN.includes(cau.toLowerCase())) {
    return { hopLe: false, loi: 'Câu này chưa nói được điều gì — hôm nay việc đi tới bước nào?' };
  }
  if (input.cauGanNhat && cau === input.cauGanNhat.trim()) {
    return { hopLe: false, loi: 'Nội dung giống hệt hôm qua — hôm nay có gì khác không?' };
  }
  if (input.co !== 'XANH') {
    if (input.vuongMac.trim().length < 5) {
      return { hopLe: false, loi: 'Cờ vàng/đỏ cần ghi rõ «Đang vướng vì…»' };
    }
    if (input.hanhDongHomNay.trim().length < 5) {
      return { hopLe: false, loi: 'Cần ghi «Hôm nay tôi làm…» — không lưu được nếu chỉ nêu vướng mắc.' };
    }
  }
  return { hopLe: true, loi: null };
}

/** Mẫu câu gợi ý theo cờ (hiện sẵn dưới ô nhập) */
export const CT2_MAU_CAU: Record<Ct2Co, string> = {
  XANH: 'Đã xong bước [X], dự kiến hoàn thành đúng hẹn ngày [dd/mm].',
  VANG: 'Đang chậm ở bước [X] vì [lý do]. Hôm nay tôi [hành động] để bắt kịp.',
  DO: 'Đang vướng [nguyên nhân, ai đang giữ]. Hôm nay tôi [hành động] và cần [ai] hỗ trợ [việc gì] trước [ngày].',
};

// ---------------------------------------------------------------------------
// Luật chuyển trạng thái (PDCA khép vòng ở cấp THẺ — đặc tả §3.3, §4.1)
// ---------------------------------------------------------------------------

export interface BoiCanhChuyen {
  coDongP: boolean;
  coDongC: boolean;
  coDongA: boolean;
  phanTram: number;
  laLanhDao: boolean;
  loai: Ct2Loai;
}

/** null = được chuyển; chuỗi = lý do từ chối (tiếng Việt, hiện cho người dùng) */
export function lyDoChanChuyen(tu: Ct2TrangThai, den: Ct2TrangThai, bc: BoiCanhChuyen): string | null {
  if (tu === den) return null;
  if (bc.loai === 'THUONG_TRUC' && ['CHO_PHOI_HOP', 'CHO_DUYET', 'HOAN_THANH'].includes(den)) {
    return 'Việc THƯỜNG TRỰC không đi qua luồng Kanban tiến trình — theo dõi ở bảng chỉ số riêng.';
  }
  if (den === 'DANG_LAM' && tu === 'CHUAN_BI' && bc.loai === 'TIEN_TRINH' && !bc.coDongP) {
    return 'Chưa có dòng Plan (P) — ghi cách làm/mốc kiểm soát trước khi bắt đầu.';
  }
  if (den === 'HOAN_THANH') {
    if (bc.phanTram !== 100) return 'Chưa đạt 100% — cập nhật tiến độ trước khi chuyển Hoàn thành.';
    if (!bc.coDongC) return 'Thiếu bước Check (C) — đối chiếu kết quả với chỉ tiêu trước khi Hoàn thành.';
  }
  if (den === 'DA_DONG') {
    if (!bc.laLanhDao) return 'Chỉ Trưởng/Phó phòng được chốt «Đã đóng».';
    if (!bc.coDongA) return 'Thiếu bước Act (A) — ghi bài học rút ra trước khi đóng.';
  }
  if (den === 'DUNG_HUY' && !bc.laLanhDao) {
    return 'Chỉ Trưởng/Phó phòng được Dừng/Hủy đầu việc.';
  }
  if ((den === 'CHO_PHOI_HOP' || den === 'CHO_DUYET') === false && (tu === 'DA_DONG' || tu === 'DUNG_HUY') && !bc.laLanhDao) {
    return 'Thẻ đã đóng/hủy — chỉ lãnh đạo Phòng mở lại được.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cảnh báo ngoại lệ trên bàn Kanban
// ---------------------------------------------------------------------------

const NGAY_MS = 86_400_000;

function ngayVn(iso: string | Date): number {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  // Quy mọi mốc về 0h theo giờ VN để so sánh theo NGÀY, không theo giờ
  const vn = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return Math.floor(new Date(vn.getFullYear(), vn.getMonth(), vn.getDate()).getTime() / NGAY_MS);
}

/** Số ngày quá hạn (0 = chưa quá). Thẻ đã xong/đóng/hủy không tính. */
export function soNgayQuaHan(dv: Pick<Ct2DauViec, 'han_hoan_thanh' | 'trang_thai'>, moc: Date = new Date()): number {
  if (!CT2_TRANG_THAI_CHAY.includes(dv.trang_thai)) return 0;
  const lech = ngayVn(moc) - ngayVn(`${dv.han_hoan_thanh}T00:00:00+07:00`);
  return Math.max(0, lech);
}

/** Số ngày thẻ "im lặng" — không có nhịp mới. Thẻ chưa từng có nhịp tính từ ngày bắt đầu. */
export function soNgayImLang(dv: Pick<Ct2DauViec, 'nhip_gan_nhat' | 'ngay_bat_dau' | 'trang_thai'>, moc: Date = new Date()): number {
  if (dv.trang_thai !== 'DANG_LAM') return 0; // cột chờ: đồng hồ đã đổi chủ
  const tu = dv.nhip_gan_nhat ?? `${dv.ngay_bat_dau}T00:00:00+07:00`;
  return Math.max(0, ngayVn(moc) - ngayVn(tu));
}

/** Tuổi thẻ trong cột chờ (ngày) — quá CT2_NGUONG_TUOI_CHO thì escalate người giữ */
export function tuoiCho(dv: Pick<Ct2DauViec, 'giu_tu' | 'trang_thai'>, moc: Date = new Date()): number {
  if ((dv.trang_thai !== 'CHO_PHOI_HOP' && dv.trang_thai !== 'CHO_DUYET') || !dv.giu_tu) return 0;
  return Math.max(0, ngayVn(moc) - ngayVn(dv.giu_tu));
}

/** Cảnh báo "Chuẩn bị quá lâu": còn ≤ 25% quỹ thời gian mà chưa khởi động */
export function chuanBiQuaLau(dv: Pick<Ct2DauViec, 'trang_thai' | 'ngay_bat_dau' | 'han_hoan_thanh'>, moc: Date = new Date()): boolean {
  if (dv.trang_thai !== 'CHUAN_BI') return false;
  const tong = ngayVn(`${dv.han_hoan_thanh}T00:00:00+07:00`) - ngayVn(`${dv.ngay_bat_dau}T00:00:00+07:00`);
  if (tong <= 0) return true;
  const conLai = ngayVn(`${dv.han_hoan_thanh}T00:00:00+07:00`) - ngayVn(moc);
  return conLai / tong <= 0.25;
}

/** Đếm WIP theo người: số thẻ "Đang làm" của mỗi người phụ trách */
export function demWip(ds: Array<Pick<Ct2DauViec, 'trang_thai' | 'nguoi_chiu_trach_nhiem'>>): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of ds) {
    if (d.trang_thai === 'DANG_LAM') {
      m.set(d.nguoi_chiu_trach_nhiem, (m.get(d.nguoi_chiu_trach_nhiem) ?? 0) + 1);
    }
  }
  return m;
}

/**
 * Điểm rủi ro (M4 — đặc tả §7.4):
 * (ngày quá hạn × 3) + (ngày im lặng × 2) + (5 nếu Trọng điểm BGĐ) + (3 nếu chặn phòng khác)
 */
export function diemRuiRo(
  dv: Pick<Ct2DauViec, 'han_hoan_thanh' | 'trang_thai' | 'nhip_gan_nhat' | 'ngay_bat_dau' | 'muc_uu_tien' | 'lien_phong'>,
  moc: Date = new Date(),
): number {
  return soNgayQuaHan(dv, moc) * 3
    + soNgayImLang(dv, moc) * 2
    + (dv.muc_uu_tien === 'TRONG_DIEM_BGD' ? 5 : 0)
    + (dv.lien_phong ? 3 : 0);
}

/** Sắp thẻ trong cột: đỏ → vàng → xanh, trong cùng cờ thì gần hạn lên trước */
export function sapXepThe(ds: Ct2DauViec[], moc: Date = new Date()): Ct2DauViec[] {
  const diemCo: Record<Ct2Co, number> = { DO: 0, VANG: 1, XANH: 2 };
  return [...ds].sort((a, b) => {
    const uuTien = (x: Ct2DauViec) => (x.muc_uu_tien === 'TRONG_DIEM_BGD' ? 0 : 1);
    if (uuTien(a) !== uuTien(b)) return uuTien(a) - uuTien(b);
    if (diemCo[a.co_tinh_trang] !== diemCo[b.co_tinh_trang]) {
      return diemCo[a.co_tinh_trang] - diemCo[b.co_tinh_trang];
    }
    return a.han_hoan_thanh.localeCompare(b.han_hoan_thanh);
  });
}

/** Nhãn PDCA gợi ý theo ngữ cảnh thẻ (cán bộ vẫn xác nhận được nhãn khác) */
export function goiYNhan(trangThai: Ct2TrangThai, phanTram: number): Ct2NhanPdca {
  if (trangThai === 'CHUAN_BI') return 'P';
  if (phanTram >= 100) return 'C';
  if (trangThai === 'HOAN_THANH' || trangThai === 'DA_DONG') return 'A';
  return 'D';
}

/** Lọc bỏ emoji khỏi tên đầu việc khi lưu (đặc tả §8.3) */
export function locEmojiTieuDe(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
}

/** Bảng này chưa có trong database — migration chưa được áp vào project. */
export function laLoiThieuBangCt2(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '')
    || /Could not find the (function|table)/i.test(error.message ?? '');
}
