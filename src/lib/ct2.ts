/**
 * Chiêu thức 2 — Kanban 5W2H + PDCA (đặc tả v1.0, 01/08/2026).
 *
 * Toàn bộ luật nghiệp vụ phía client nằm ở đây dưới dạng HÀM THUẦN, kiểm thử
 * được không cần mạng hay React. Database có bộ trigger chặn tương đương —
 * client chặn để trải nghiệm tốt, server chặn để dữ liệu không thể sai.
 */

import { cauHinhNhip, gioSangPhut } from './cauHinhNhip';
import { ngayLamViecTheoLich, ngayVnChuoi } from './lichNghi';

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
  /** Ba trường dưới để trống được lúc ghi việc, bắt buộc ở Cổng 2 (khởi động) */
  ket_qua_dau_ra: string | null;
  muc_tieu_lien_ket: string | null;
  cach_lam: string | null;
  chi_tieu_dinh_luong: number | null;
  don_vi: string | null;
  nguon_luc_du_kien: string | null;
  /**
   * Bốn trường dưới đây để trống được, NHƯNG chỉ ở dữ liệu nhập từ board cũ.
   *
   * Bàn Kanban của Phòng KHDN trên Miro có 1/21 thẻ không có người phụ trách,
   * 4/21 không có hạn, 18/21 không có ngày bắt đầu, và không có cột lãnh đạo
   * theo dõi nào. Bịa một cái tên vào ô «ai chịu trách nhiệm» là gán trách
   * nhiệm cho người không nhận — nên để trống và hiện thành cảnh báo.
   *
   * Thẻ ghi mới trong ứng dụng vẫn bắt buộc đủ: trigger `f_ct2_dv_truoc_tao`
   * chặn ở database, không chỉ ở form.
   */
  nguoi_chiu_trach_nhiem: string | null;
  nguoi_phoi_hop: string[];
  lanh_dao_theo_doi: string | null;
  phong: string;
  pham_vi: 'PHONG' | 'PGD' | 'CHI_NHANH';
  loai_dau_viec: Ct2Loai;
  lien_phong: boolean;
  cac_phong_tham_gia: string[];
  muc_uu_tien: Ct2UuTien;
  trang_thai: Ct2TrangThai;
  phan_tram: number;
  co_tinh_trang: Ct2Co;
  ngay_bat_dau: string | null;
  han_hoan_thanh: string | null;
  han_goc: string | null;
  ly_do_dung_huy: string | null;
  nguoi_dang_giu: string | null;
  giu_tu: string | null;
  nhip_gan_nhat: string | null;
  nguon_viec: Ct2NguonViec;
  cuoc_hop: string | null;
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

/**
 * Phạm vi của một luồng trao đổi. Cùng một bảng bình luận phục vụ cả ba bàn —
 * Chiêu thức 2, Phê duyệt tín dụng và Kanban 38 skill/Dấu ấn — để cán bộ chỉ
 * phải học một cách trao đổi, và để @nhắc tên chỉ phải viết một lần.
 */
export type Ct2PhamVi = 'DAU_VIEC' | 'PHONG' | 'CHIEN_DICH' | 'HO_SO_TIN_DUNG' | 'THE_KANBAN';

export interface Ct2BinhLuan {
  id: string;
  pham_vi: Ct2PhamVi;
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

/**
 * Tuổi tối đa cột chờ trước khi escalate, tính bằng ngày làm việc.
 *
 * Hằng số này là MẶC ĐỊNH; giá trị đang chạy lấy qua `nguongTuoiCho()` vì TCTH
 * cấu hình được trong «Cài đặt ngày giờ».
 */
export const CT2_NGUONG_TUOI_CHO = 3;

/** Ngưỡng cột chờ đang áp dụng theo cài đặt của TCTH */
export function nguongTuoiCho(): number {
  return cauHinhNhip().nguong_tuoi_cho;
}

/** Bộ cảm xúc rút gọn cho bình luận (cố ý giới hạn — đặc tả §8.3) */
export const CT2_CAM_XUC = ['👍', '✅', '👀', '🎯', '🙏', '❤️', '🔥'] as const;

// ---------------------------------------------------------------------------
// HAI CỔNG NHẬP — đặt chặn cứng đúng cửa, thay vì dồn hết vào lúc tạo
//
// Căn cứ: quy chế Miro đang chạy của Chi nhánh (PhanTichKanBan §A1) đã kết
// luận từ thực tế "yêu cầu điền quá nhiều trường trên màn hình điện thoại là
// nguyên nhân chính khiến card bị bỏ trống hoàn toàn" → chỉ 3 trường bắt buộc.
// Đặc tả v1.0 §3.1 lại chặn đủ 11 trường ngay lúc tạo. Hai văn bản cùng chống
// một lỗi ("card vô chủ") bằng hai thuốc ngược nhau.
//
// Hòa giải: chúng nói về hai thời điểm tâm lý khác nhau.
//   · Lúc GHI VIỆC (đang họp giao ban, cầm điện thoại): chỉ biết việc gì, ai
//     làm, bao giờ xong → Cổng 1 hỏi đúng 3 điều đó.
//   · Lúc BẮT TAY LÀM: mới đủ bình tĩnh nghĩ kết quả, mục tiêu, các bước →
//     Cổng 2 đòi đủ 5W2H, chính là bước P (Plan) của PDCA.
// Không thẻ nào CHẠY mà thiếu 5W2H (giữ đúng mục tiêu đặc tả), nhưng không ai
// bị chặn ở giây thứ 20 khi mới chỉ muốn ghi lại một chỉ đạo.
// ---------------------------------------------------------------------------

/** Ba nguồn việc vào Kanban. Việc lặp hằng ngày KHÔNG thuộc nhóm nào — không vào bảng. */
export type Ct2NguonViec = 'KE_HOACH' | 'GIAO_BAN' | 'CHU_DONG';

export const CT2_NGUON_VIEC: Array<{ ma: Ct2NguonViec; ten: string; icon: string; mo: string }> = [
  { ma: 'KE_HOACH', ten: 'Kế hoạch hành động', icon: '📋', mo: 'Việc đã có trong KHHĐ của Phòng kỳ này' },
  { ma: 'GIAO_BAN', ten: 'Chỉ đạo giao ban', icon: '🗣️', mo: 'Việc phát sinh từ giao ban tuần/tháng' },
  { ma: 'CHU_DONG', ten: 'Phòng/cá nhân chủ động', icon: '💡', mo: 'Việc tự thấy cần làm, không ai giao' },
];

// ---------------------------------------------------------------------------
// CỔNG 1 — Ghi việc (3 trường, dưới 30 giây, làm được trong lúc họp)
// ---------------------------------------------------------------------------

export interface Ct2FormGhiViec {
  nguon_viec: Ct2NguonViec;
  cuoc_hop: string;               // chỉ dùng khi nguồn = GIAO_BAN
  tieu_de: string;
  nguoi_chiu_trach_nhiem: string;
  han_hoan_thanh: string;
}

/** Các chuỗi tiêu đề rỗng nghĩa bị chặn (đặc tả 2.3 — "theo dõi", "làm việc") */
const TIEU_DE_RONG_NGHIA = ['theo dõi', 'theo doi', 'làm việc', 'lam viec', 'xử lý', 'xu ly', 'triển khai', 'trien khai'];

export interface Ct2ThieuTruong { truong: string; ten: string; ly_do?: string }

export function kiemTraGhiViec(f: Ct2FormGhiViec): Ct2ThieuTruong[] {
  const thieu: Ct2ThieuTruong[] = [];
  const tieuDe = f.tieu_de.trim();
  if (tieuDe.length < 10) {
    thieu.push({ truong: 'tieu_de', ten: 'Việc cần làm', ly_do: 'ghi rõ hơn một chút' });
  } else if (TIEU_DE_RONG_NGHIA.includes(tieuDe.toLowerCase())) {
    thieu.push({ truong: 'tieu_de', ten: 'Việc cần làm', ly_do: 'chung chung quá — làm gì, cho ai?' });
  }
  if (!f.nguoi_chiu_trach_nhiem) {
    thieu.push({ truong: 'nguoi_chiu_trach_nhiem', ten: 'Ai làm', ly_do: 'đúng 01 người, không để «gán sau»' });
  }
  if (!f.han_hoan_thanh) thieu.push({ truong: 'han_hoan_thanh', ten: 'Xong khi nào' });
  return thieu;
}

// ---------------------------------------------------------------------------
// Chọn hạn bằng cụm từ đời thường — bấm 1 lần thay cho mở lịch chọn ngày
// ---------------------------------------------------------------------------

const NGAY_MS = 86_400_000;

function ngayVnHomNay(moc: Date): Date {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return new Date(vn.getFullYear(), vn.getMonth(), vn.getDate());
}

const dinhDang = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Hạn gợi ý: cuối tuần này (thứ 6) · cuối tháng · 2 tuần nữa */
export function hanGoiY(moc: Date = new Date()): Array<{ nhan: string; ngay: string }> {
  const homNay = ngayVnHomNay(moc);
  const thu = homNay.getDay(); // 0 = CN
  const toiThu6 = (5 - thu + 7) % 7;
  const thu6 = new Date(homNay.getTime() + (toiThu6 === 0 ? 0 : toiThu6) * NGAY_MS);
  const cuoiThang = new Date(homNay.getFullYear(), homNay.getMonth() + 1, 0);
  const haiTuan = new Date(homNay.getTime() + 14 * NGAY_MS);
  const ds = [
    { nhan: 'Cuối tuần này', ngay: dinhDang(thu6) },
    { nhan: 'Trong 2 tuần', ngay: dinhDang(haiTuan) },
    { nhan: 'Cuối tháng', ngay: dinhDang(cuoiThang) },
  ];
  // Bỏ mốc đã qua hoặc trùng nhau — không đưa lựa chọn vô nghĩa lên màn hình
  const daCo = new Set<string>();
  return ds.filter((x) => {
    if (x.ngay < dinhDang(homNay) || daCo.has(x.ngay)) return false;
    daCo.add(x.ngay);
    return true;
  });
}

// ---------------------------------------------------------------------------
// CỔNG 2 — Lập kế hoạch làm (3 câu hỏi, mở khi khởi động việc)
// ---------------------------------------------------------------------------

export interface Ct2FormKeHoach {
  ket_qua_dau_ra: string;
  muc_tieu_lien_ket: string;
  /** Các bước rời — liệt kê dễ hơn viết một đoạn văn dài */
  cac_buoc: string[];
  chi_tieu_so: string;
  don_vi: string;
}

/** Gợi ý kết quả đầu ra — bấm chọn dễ hơn tự nghĩ ra (recognition > recall) */
export const CT2_GOI_Y_KET_QUA = [
  'Bộ hồ sơ hoàn chỉnh, đủ điều kiện giải ngân',
  'Danh sách khách hàng đã rà soát',
  'Văn bản/quy chế được ban hành',
  'Số liệu đạt mức chỉ tiêu giao',
  'Biên bản làm việc có kết luận',
  'Báo cáo trình lãnh đạo',
];

/** Danh mục mục tiêu cố định — chọn, không nhập tay (đặc tả 2.3) */
export const CT2_DANH_MUC_MUC_TIEU = [
  'Tăng trưởng CASA', 'Tăng trưởng tín dụng', 'Thu hồi & kiểm soát nợ',
  'Thu dịch vụ - bảo hiểm', 'Chất lượng vận hành nội bộ', 'Phát triển nhân sự - đào tạo',
];

export function kiemTraKeHoach(f: Ct2FormKeHoach): Ct2ThieuTruong[] {
  const thieu: Ct2ThieuTruong[] = [];
  if (f.ket_qua_dau_ra.trim().length < 5) {
    thieu.push({ truong: 'ket_qua_dau_ra', ten: 'Xong thì có gì' });
  }
  if (!f.muc_tieu_lien_ket.trim()) {
    thieu.push({ truong: 'muc_tieu_lien_ket', ten: 'Phục vụ mục tiêu nào' });
  }
  // Đo bằng SỐ BƯỚC, không đếm ký tự cho người dùng thấy: bắt đếm ký tự làm
  // người ta gõ cho đủ dài thay vì nghĩ cho đủ ý.
  const buoc = f.cac_buoc.map((b) => b.trim()).filter(Boolean);
  if (buoc.length < 2) {
    thieu.push({ truong: 'cac_buoc', ten: 'Các bước sẽ làm', ly_do: 'ít nhất 2 bước' });
  }
  return thieu;
}

/** Nối các bước rời thành một chuỗi cho cột cach_lam (database vẫn 1 trường) */
export function gopCacBuoc(cacBuoc: string[]): string {
  return cacBuoc
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b, i) => `B${i + 1}. ${b}`)
    .join('\n');
}

/** Tách ngược chuỗi cach_lam về từng bước để sửa lại */
export function tachCacBuoc(cachLam: string | null): string[] {
  if (!cachLam?.trim()) return ['', '', ''];
  const ds = cachLam.split('\n').map((d) => d.replace(/^B\d+[.)]?\s*/, '').trim()).filter(Boolean);
  return ds.length >= 3 ? ds : [...ds, '', '', ''].slice(0, 3);
}

/** Câu Plan (P) sinh tự động từ kế hoạch — cán bộ không phải gõ lại lần nữa */
export function cauPlanTuKeHoach(f: Ct2FormKeHoach): string {
  const buoc = f.cac_buoc.map((b) => b.trim()).filter(Boolean);
  const chiTieu = f.chi_tieu_so.trim() ? ` Chỉ tiêu: ${f.chi_tieu_so.trim()} ${f.don_vi.trim()}.` : '';
  return `Kế hoạch làm: ${buoc.length} bước — ${buoc.join('; ')}. Xong thì có: ${f.ket_qua_dau_ra.trim()}.${chiTieu}`;
}

/** Thẻ đã đủ 5W2H để khởi động chưa (dùng cho nhãn nhắc trên bàn Kanban) */
export function daDuKeHoach(dv: Pick<Ct2DauViec, 'ket_qua_dau_ra' | 'muc_tieu_lien_ket' | 'cach_lam'>): boolean {
  return (dv.ket_qua_dau_ra ?? '').trim().length >= 5
    && (dv.muc_tieu_lien_ket ?? '').trim().length > 0
    && (dv.cach_lam ?? '').trim().length >= 20;
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

function ngayVn(iso: string | Date): number {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  // Quy mọi mốc về 0h theo giờ VN để so sánh theo NGÀY, không theo giờ
  const vn = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return Math.floor(new Date(vn.getFullYear(), vn.getMonth(), vn.getDate()).getTime() / NGAY_MS);
}

/**
 * Hôm nay có phải ngày làm việc không (giờ Việt Nam).
 *
 * Nhịp Chiêu thức 2 CHỈ chạy ngày làm việc: không phải thứ Bảy/Chủ nhật, và
 * không nằm trong lịch nghỉ lễ mà TCTH đã nhập. Ngày «đi làm bù» thì ngược lại
 * — vẫn là ngày làm việc dù rơi vào cuối tuần.
 */
export function laNgayLamViec(moc: Date = new Date()): boolean {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return ngayLamViecTheoLich(ngayVnChuoi(moc), vn.getDay());
}

/**
 * Số NGÀY LÀM VIỆC trôi qua từ `tu` đến `den`, không tính ngày `tu`.
 *
 * Đây là đơn vị đúng cho mọi đồng hồ đo «người ta đã có bao nhiêu cơ hội để xử
 * lý». Nếu đếm ngày lịch, một hồ sơ trình chiều thứ Sáu sẽ hiện «chờ 3 ngày»
 * ngay sáng thứ Hai — báo đỏ một người chưa hề có ngày làm việc nào để xử lý.
 * Cảnh báo sai kiểu đó lặp vài lần là cán bộ thôi tin bảng.
 *
 * Trừ thứ Bảy/Chủ nhật VÀ lịch nghỉ lễ do TCTH nhập; cộng lại ngày đi làm bù.
 * Bên database, `ct2_ngay_lam_viec` đọc cùng bảng và cho cùng kết quả.
 */
export function soNgayLamViec(tu: string | Date, den: string | Date = new Date()): number {
  const a = ngayVn(tu);
  const b = ngayVn(den);
  if (b <= a) return 0;
  // Chặn trên: mốc rác (giu_tu sai vài năm) không được kéo vòng lặp chạy mãi
  const soNgay = Math.min(b - a, 400);
  // Lấy thứ VÀ ngày của mốc bắt đầu THEO LỊCH VN rồi cộng dồn — không suy ra
  // thứ từ chỉ số ngày, vì chỉ số đó lệch một ngày ở máy chạy múi giờ dương.
  const d0 = typeof tu === 'string' ? new Date(tu) : tu;
  const vn0 = new Date(d0.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  let thu = vn0.getDay();
  const chay = new Date(vn0.getFullYear(), vn0.getMonth(), vn0.getDate());
  let dem = 0;
  for (let i = 1; i <= soNgay; i++) {
    thu = (thu + 1) % 7;
    chay.setDate(chay.getDate() + 1);
    const chuoi = `${chay.getFullYear()}-${String(chay.getMonth() + 1).padStart(2, '0')}-${String(chay.getDate()).padStart(2, '0')}`;
    if (ngayLamViecTheoLich(chuoi, thu)) dem++;
  }
  return dem;
}

/**
 * Số ngày quá hạn (0 = chưa quá). Thẻ đã xong/đóng/hủy không tính.
 *
 * CỐ Ý đếm ngày lịch chứ không phải ngày làm việc: hạn hoàn thành là lời hứa
 * theo một ngày trên tờ lịch. Trễ hai ngày vắt qua cuối tuần thì với khách hàng
 * và với BGĐ vẫn là trễ hai ngày. Khác với đồng hồ chờ ở dưới — cái đó đo cơ
 * hội xử lý của một người, nên phải trừ ngày nghỉ.
 */
export function soNgayQuaHan(dv: Pick<Ct2DauViec, 'han_hoan_thanh' | 'trang_thai'>, moc: Date = new Date()): number {
  // Không có hạn thì không có gì để trễ. Coi thẻ thiếu hạn là quá hạn sẽ báo
  // đỏ oan toàn bộ thẻ nhập từ board cũ ngay hôm đầu — cái thiếu ở đây là DỮ
  // LIỆU, và nó đã được nêu riêng ở thieuTruongBatBuoc().
  if (!CT2_TRANG_THAI_CHAY.includes(dv.trang_thai) || !dv.han_hoan_thanh) return 0;
  const lech = ngayVn(moc) - ngayVn(`${dv.han_hoan_thanh}T00:00:00+07:00`);
  return Math.max(0, lech);
}

/**
 * Số NGÀY LÀM VIỆC thẻ "im lặng" — không có nhịp mới. Thẻ chưa từng có nhịp
 * tính từ ngày bắt đầu. Cuối tuần không đòi nhịp nên không tính vào đây.
 */
export function soNgayImLang(
  dv: Pick<Ct2DauViec, 'nhip_gan_nhat' | 'ngay_bat_dau' | 'trang_thai' | 'created_at'>,
  moc: Date = new Date(),
): number {
  if (dv.trang_thai !== 'DANG_LAM') return 0; // cột chờ: đồng hồ đã đổi chủ
  // Thẻ nhập từ board cũ không có ngày bắt đầu — đếm từ `created_at`, tức ngày
  // thẻ vào hệ thống này. Đồng hồ chạy chậm hơn sự thật, nhưng đó là sự thật
  // KIỂM CHỨNG ĐƯỢC: từ hôm vào hệ thống tới nay chưa ai ghi nhịp nào.
  const tu = dv.nhip_gan_nhat
    ?? (dv.ngay_bat_dau ? `${dv.ngay_bat_dau}T00:00:00+07:00` : dv.created_at);
  if (!tu) return 0;
  return soNgayLamViec(tu, moc);
}

/** Tuổi thẻ trong cột chờ (NGÀY LÀM VIỆC) — quá CT2_NGUONG_TUOI_CHO thì escalate người giữ */
export function tuoiCho(dv: Pick<Ct2DauViec, 'giu_tu' | 'trang_thai'>, moc: Date = new Date()): number {
  if ((dv.trang_thai !== 'CHO_PHOI_HOP' && dv.trang_thai !== 'CHO_DUYET') || !dv.giu_tu) return 0;
  return soNgayLamViec(dv.giu_tu, moc);
}

/** Cảnh báo "Chuẩn bị quá lâu": còn ≤ 25% quỹ thời gian mà chưa khởi động */
export function chuanBiQuaLau(dv: Pick<Ct2DauViec, 'trang_thai' | 'ngay_bat_dau' | 'han_hoan_thanh'>, moc: Date = new Date()): boolean {
  if (dv.trang_thai !== 'CHUAN_BI') return false;
  // Thiếu một trong hai mốc thì không tính được quỹ thời gian. Trả false chứ
  // không đoán bừa — cái thiếu là dữ liệu, thieuTruongBatBuoc() đã nêu rồi.
  if (!dv.han_hoan_thanh || !dv.ngay_bat_dau) return false;
  const tong = ngayVn(`${dv.han_hoan_thanh}T00:00:00+07:00`) - ngayVn(`${dv.ngay_bat_dau}T00:00:00+07:00`);
  if (tong <= 0) return true;
  const conLai = ngayVn(`${dv.han_hoan_thanh}T00:00:00+07:00`) - ngayVn(moc);
  return conLai / tong <= 0.25;
}

/** Đếm WIP theo người: số thẻ "Đang làm" của mỗi người phụ trách */
export function demWip(ds: Array<Pick<Ct2DauViec, 'trang_thai' | 'nguoi_chiu_trach_nhiem'>>): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of ds) {
    // Thẻ vô chủ không cộng vào WIP của ai — nó là vấn đề riêng, và cộng nó
    // vào một nhóm «không rõ ai» chỉ làm sai con số nghẽn của người thật.
    if (d.trang_thai === 'DANG_LAM' && d.nguoi_chiu_trach_nhiem) {
      m.set(d.nguoi_chiu_trach_nhiem, (m.get(d.nguoi_chiu_trach_nhiem) ?? 0) + 1);
    }
  }
  return m;
}

/**
 * Ba trường bắt buộc của quy chế §A1 mà thẻ này đang thiếu.
 *
 * Quy chế nói rõ mỗi thẻ phải có Status + Assignee + End Date, không hơn — vì
 * bắt điền quá nhiều trường trên điện thoại là lý do chính khiến thẻ bị bỏ
 * trống hoàn toàn. Status luôn có (là cột Kanban), nên chỉ còn hai thứ đáng
 * đòi, cộng thêm lãnh đạo theo dõi vì hệ thống dùng nó để định tuyến báo cáo.
 *
 * Ô trống PHẢI nói ra được. Nếu im lặng thì thẻ vô chủ trông sạch sẽ y hệt
 * thẻ có chủ, và «card vô chủ» là lỗi nặng nhất của quy chế.
 */
export function thieuTruongBatBuoc(
  dv: Pick<Ct2DauViec, 'nguoi_chiu_trach_nhiem' | 'han_hoan_thanh' | 'ngay_bat_dau'
    | 'lanh_dao_theo_doi' | 'trang_thai' | 'loai_dau_viec'>,
): Ct2ThieuTruong[] {
  const ds: Ct2ThieuTruong[] = [];
  if (dv.trang_thai === 'DA_DONG' || dv.trang_thai === 'DUNG_HUY') return ds;
  if (!dv.nguoi_chiu_trach_nhiem) {
    ds.push({ truong: 'nguoi_chiu_trach_nhiem', ten: 'Ai làm', ly_do: 'thẻ đang vô chủ' });
  }
  // Việc thường trực không có điểm kết thúc — đòi hạn ở đó là sai loại thước
  if (!dv.han_hoan_thanh && dv.loai_dau_viec !== 'THUONG_TRUC') {
    ds.push({ truong: 'han_hoan_thanh', ten: 'Xong khi nào', ly_do: 'không đo được đúng hẹn' });
  }
  if (!dv.ngay_bat_dau) ds.push({ truong: 'ngay_bat_dau', ten: 'Bắt đầu từ ngày' });
  if (!dv.lanh_dao_theo_doi) ds.push({ truong: 'lanh_dao_theo_doi', ten: 'Lãnh đạo theo dõi' });
  return ds;
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
    // Thẻ chưa có hạn xếp cuối nhóm — KHÔNG gọi localeCompare trên null.
    // Đúng dòng này ở bàn PDTD từng làm trắng cả màn hồi 03/08/2026.
    if (!a.han_hoan_thanh || !b.han_hoan_thanh) {
      return (a.han_hoan_thanh ? 0 : 1) - (b.han_hoan_thanh ? 0 : 1);
    }
    return a.han_hoan_thanh.localeCompare(b.han_hoan_thanh);
  });
}

/**
 * Mức chú ý của một thẻ — dùng cho chế độ «Toàn cảnh» (mỗi thẻ một ô màu).
 *
 * Gộp mọi tín hiệu xấu về một thang bốn bậc để mắt chỉ phải đọc MÀU chứ không
 * phải đọc chữ: quá hạn · cờ đỏ · nghẽn cột chờ đều thành đỏ; cờ vàng · im
 * lặng 3 ngày · chuẩn bị mà chưa lập kế hoạch thành vàng.
 */
export type Ct2MucChuY = 'DO' | 'VANG' | 'XANH' | 'XONG';

export function mucChuY(
  t: Pick<Ct2DauViec, 'trang_thai' | 'co_tinh_trang' | 'han_hoan_thanh' | 'giu_tu'
    | 'nhip_gan_nhat' | 'ngay_bat_dau' | 'ket_qua_dau_ra' | 'muc_tieu_lien_ket' | 'cach_lam'
    | 'nguoi_chiu_trach_nhiem' | 'lanh_dao_theo_doi' | 'loai_dau_viec' | 'created_at'>,
  moc: Date = new Date(),
): Ct2MucChuY {
  if (t.trang_thai === 'DA_DONG' || t.trang_thai === 'DUNG_HUY') return 'XONG';
  if (soNgayQuaHan(t, moc) > 0 || t.co_tinh_trang === 'DO' || tuoiCho(t, moc) > nguongTuoiCho()) {
    return 'DO';
  }
  // Thiếu trường bắt buộc là VÀNG chứ không đỏ: cái thiếu ở đây là dữ liệu,
  // chưa phải rủi ro tiến độ đã xảy ra. Nhưng dứt khoát không được xanh —
  // xanh nghĩa là «ổn», mà một thẻ vô chủ thì không ổn.
  if (t.co_tinh_trang === 'VANG' || soNgayImLang(t, moc) >= 3
      || thieuTruongBatBuoc(t).length > 0
      || (t.trang_thai === 'CHUAN_BI' && !daDuKeHoach(t))) {
    return 'VANG';
  }
  return 'XANH';
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

/**
 * Đang trong khung giờ nhịp sáng (thứ 2–6, 6h45–8h45 giờ VN)?
 *
 * Dùng để bật làm tươi tự động: trong 2 tiếng này bảng phòng đổi liên tục nên
 * đáng tự cập nhật; ngoài khung thì thôi, không có gì để xem mà vẫn tốn query.
 * Đây là cách rẻ để có cảm giác «bảng sống» như Miro mà không cần 150 kết nối
 * websocket mở suốt ngày.
 */
export function trongKhungNhip(moc: Date = new Date()): boolean {
  // Ngày nghỉ lễ cũng không có nhịp — dùng chung luật với laNgayLamViec
  if (!laNgayLamViec(moc)) return false;
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const phut = vn.getHours() * 60 + vn.getMinutes();
  const ch = cauHinhNhip();
  return phut >= gioSangPhut(ch.gio_mo_nhip) && phut <= gioSangPhut(ch.gio_dong_nhip);
}

/** Bảng này chưa có trong database — migration chưa được áp vào project. */
export function laLoiThieuBangCt2(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '')
    || /Could not find the (function|table)/i.test(error.message ?? '');
}

// ---------------------------------------------------------------------------
// Thông báo
// ---------------------------------------------------------------------------

/** Một dòng trong hàng đợi ct2_thong_bao (phần giao diện cần đọc) */
export interface Ct2ThongBao {
  id: string;
  ma_su_kien: string;
  dau_viec_id: string | null;
  tieu_de: string;
  noi_dung: string;
  muc: 'NHE' | 'DO' | 'CHAN' | string;
  created_at: string;
  doc_luc: string | null;
}

export const CT2_DAU_MUC: Record<string, string> = { CHAN: '⛔', DO: '🔴', NHE: '🟡' };

/**
 * Bấm vào thông báo phải mở đúng thứ nó nói tới.
 *
 * Một thông báo dẫn về trang chung là thông báo hỏng: cán bộ vẫn phải tự đi tìm
 * thẻ giữa bảy cột, và lần sau họ sẽ bỏ qua chuông. Quy tắc này dùng chung với
 * edge function notify-ct2 để push và chuông trong ứng dụng không lệch nhau.
 */
export function duongDanThongBao(tb: Pick<Ct2ThongBao, 'ma_su_kien' | 'dau_viec_id'>): string {
  if (tb.dau_viec_id) return `/one/chieu-thuc-2?the=${tb.dau_viec_id}`;
  if (tb.ma_su_kien.startsWith('HS_')) return '/one/chieu-thuc-2?tab=tin-dung';
  return '/one/chieu-thuc-2';
}

/** «12 phút trước» dễ đọc hơn dấu thời gian đầy đủ trong danh sách chuông */
export function khiNaoThongBao(iso: string, moc: Date = new Date()): string {
  const phut = Math.round((moc.getTime() - new Date(iso).getTime()) / 60000);
  if (phut < 1) return 'vừa xong';
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.round(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
