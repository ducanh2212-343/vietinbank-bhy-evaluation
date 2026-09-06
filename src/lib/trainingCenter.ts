/**
 * Bắc Hưng Yên Training Center — cấu phần đào tạo và rèn luyện của cổng ONE
 * (đặc tả 1.0 ngày 06/09/2026; chương trình đầu tiên: 10 ngày Trưởng phòng KHDN
 * Bản 4.0, 07–18/09/2026).
 *
 * Toàn bộ luật nghiệp vụ phía client nằm ở đây dưới dạng HÀM THUẦN, kiểm thử
 * được không cần mạng hay React — cùng khuôn với src/lib/ct2.ts. Database giữ
 * hàng rào thật (RLS theo bảng thành viên chương trình); client chỉ bố trí giao
 * diện cho đúng vai.
 *
 * Tên gọi: «Training Center» viết hai chữ t, hai chữ n. Tên rút gọn khi hẹp:
 * «BHY Training Center», KHÔNG rút thành BHY TC. Dòng định vị: «Vun gốc · Vươn cành».
 */

import { cotHienThi, type Ct2DauViec, type Ct2TrangThai } from './ct2';
import { ngayVnChuoi } from './lichNghi';

export const TTC_TEN = 'Bắc Hưng Yên Training Center';
export const TTC_TEN_NGAN = 'BHY Training Center';
export const TTC_DINH_VI = 'Vun gốc · Vươn cành';

// ---------------------------------------------------------------------------
// Vai và dữ liệu nền
// ---------------------------------------------------------------------------

/**
 * Bốn vai trong một chương trình — đọc từ bảng thành viên, KHÔNG từ vai trò
 * đăng nhập chung của cổng. Lý do: Giám đốc mang system_admin, PGĐ phụ trách
 * chỉ là một trong ba PGĐ, Phòng TCTH có nhiều tài khoản tcth_admin nhưng chỉ
 * một người quản trị chương trình. Vai trò chung không tách được những chuyện đó.
 */
export type TtcVai = 'hoc_vien' | 'huong_dan' | 'bgd' | 'quan_tri';

export const TTC_TEN_VAI: Record<TtcVai, string> = {
  hoc_vien: 'Học viên',
  huong_dan: 'Người hướng dẫn',
  bgd: 'Ban Giám đốc',
  quan_tri: 'Quản trị chương trình',
};

/** Năm phần của một ngày, theo thứ tự trên lịch */
export type TtcPhan = 'KHOI_DONG' | 'VAN_BAN' | 'THUC_HANH' | 'TRINH_BAY' | 'TU_SUY_NGAM';

export const TTC_PHAN: Array<{ ma: TtcPhan; ten: string }> = [
  { ma: 'KHOI_DONG', ten: 'Khởi động' },
  { ma: 'VAN_BAN', ten: 'Nghiên cứu văn bản' },
  { ma: 'THUC_HANH', ten: 'Thực hành' },
  { ma: 'TRINH_BAY', ten: 'Trình bày và phản hồi' },
  { ma: 'TU_SUY_NGAM', ten: 'Tự suy ngẫm' },
];

/** Ai phụ trách một đầu việc trên lịch */
export type TtcPhuTrach = 'HOC_VIEN' | 'GD' | 'PGD' | 'GD_PGD' | 'TCTH' | 'TO_CHAM' | 'CAN_BO';

export const TTC_TEN_PHU_TRACH: Record<TtcPhuTrach, string> = {
  HOC_VIEN: 'Học viên tự làm',
  GD: 'Giám đốc',
  PGD: 'PGĐ phụ trách',
  GD_PGD: 'Giám đốc và/hoặc PGĐ',
  TCTH: 'Phòng Tổng hợp',
  TO_CHAM: 'Tổ chấm',
  CAN_BO: 'Cán bộ tham gia',
};

export type TtcThietBi = 'MAY_CO_QUAN' | 'LAPTOP' | 'GIAY' | 'KHONG';
export const TTC_TEN_THIET_BI: Record<TtcThietBi, string> = {
  MAY_CO_QUAN: 'Máy tính cơ quan',
  LAPTOP: 'Laptop cá nhân',
  GIAY: 'Giấy, viết tay',
  KHONG: '—',
};

export type TtcNoiNop = 'EMAIL' | 'TRAINING_CENTER' | 'TCTH' | 'KHONG';
export const TTC_TEN_NOI_NOP: Record<TtcNoiNop, string> = {
  EMAIL: 'Gửi email Ban Giám đốc',
  TRAINING_CENTER: 'Nhập trên Training Center',
  TCTH: 'Nộp Phòng Tổng hợp',
  KHONG: 'Không có sản phẩm',
};

/** Bốn nhóm đối tượng phục vụ (đặc tả Mục I) — trục xếp danh mục chương trình */
export type TtcNhomDoiTuong = 'CAN_BO_MOI' | 'NANG_CAP_CHUYEN_MON' | 'QUY_HOACH' | 'QUAN_LY_DUONG_NHIEM';

export const TTC_NHOM_DOI_TUONG: Array<{ ma: TtcNhomDoiTuong; ten: string; nhuCau: string; duKien: string }> = [
  { ma: 'CAN_BO_MOI', ten: 'Cán bộ mới', nhuCau: 'Nắm quy trình, sản phẩm và văn hoá làm việc trong 30–60 ngày đầu', duKien: 'Chương trình hội nhập 30 ngày; bộ bài rà soát cơ bản' },
  { ma: 'NANG_CAP_CHUYEN_MON', ten: 'Cán bộ cần nâng cấp chuyên môn', nhuCau: 'Bổ sung đúng khoảng trống đã lộ ra qua công việc thực tế', duKien: 'Chương trình theo chuyên đề: thẩm định tín dụng, dự án đầu tư, sản phẩm' },
  { ma: 'QUY_HOACH', ten: 'Cán bộ quy hoạch', nhuCau: 'Chuyển từ làm chuyên môn sang quản trị công việc và quản trị người khác', duKien: 'Chương trình 10 ngày như bản đang chạy, điều chỉnh theo vị trí quy hoạch' },
  { ma: 'QUAN_LY_DUONG_NHIEM', ten: 'Cán bộ quản lý đương nhiệm', nhuCau: 'Rà soát năng lực định kỳ và duy trì hành vi quản trị', duKien: 'Chương trình duy trì 30–60–90 ngày; tự soi định kỳ theo 08 tiêu chí' },
];

export function tenNhomDoiTuong(ma: TtcNhomDoiTuong): string {
  return TTC_NHOM_DOI_TUONG.find((n) => n.ma === ma)?.ten ?? ma;
}

export type TtcTrangThaiCt = 'CHUAN_BI' | 'DANG_CHAY' | 'KET_THUC';
export const TTC_TEN_TRANG_THAI_CT: Record<TtcTrangThaiCt, string> = {
  CHUAN_BI: 'Chuẩn bị', DANG_CHAY: 'Đang chạy', KET_THUC: 'Đã kết thúc',
};

export interface TtcChuongTrinh {
  id: string;
  ten: string;
  mo_ta: string | null;
  ngay_bd: string;
  ngay_kt: string;
  trang_thai: TtcTrangThaiCt;
  nhom_doi_tuong: TtcNhomDoiTuong;
  loai: string | null;
  khoi_nang_luc: string | null;
  /** Chương trình mẫu — Phòng TCTH nhân bản ra chương trình mới */
  la_mau: boolean;
  /** Toạ độ + bán kính ghi nhận có mặt — giai đoạn 3, giữ chỗ */
  vi_do: number | null;
  kinh_do: number | null;
  ban_kinh_m: number;
  nguoi_tao: string | null;
  created_at: string;
  /** Cấu hình nhắc của lần đào tạo này — đọc bằng docCauHinhNhac() */
  nhac: unknown;
}

export interface TtcThanhVien {
  id: string;
  chuong_trinh_id: string;
  nguoi: string;
  vai: TtcVai;
  full_name?: string;
  avatar_url?: string | null;
}

export interface TtcNgay {
  id: string;
  chuong_trinh_id: string;
  so_thu_tu: number;
  ngay: string;
  tieu_de: string;
  khoi: string | null;
  van_ban: string | null;
  nhiem_vu_van_ban: string | null;
  chuan_bi: string | null;
  lat_cat: string | null;
  cau_hoi_tu_soi: string | null;
}

export interface TtcDauViec {
  id: string;
  ngay_id: string;
  phan: TtcPhan;
  thu_tu: number;
  /** 'HH:MM' */
  gio_bat_dau: string;
  gio_ket_thuc: string;
  ten: string;
  dau_ra: string | null;
  nguoi_phu_trach: TtcPhuTrach;
  thiet_bi: TtcThietBi;
  noi_nop: TtcNoiNop;
  trong_tam: boolean;
  /** Tính năng bật cho đầu việc — bật thì học viên phải nộp mới tích được */
  tinh_nang: TtcTinhNang[];
}

/** Tính năng của một đầu việc trong lộ trình */
export type TtcTinhNang = 'NOP_TEP' | 'GHI_CHU' | 'DUONG_DAN';

export const TTC_TINH_NANG: Array<{ ma: TtcTinhNang; ten: string; mo: string }> = [
  { ma: 'NOP_TEP', ten: 'Nộp tệp đính kèm', mo: 'Học viên tải sản phẩm lên (PDF, Word, Excel, PowerPoint, ảnh) ngay trên dòng đầu việc' },
  { ma: 'GHI_CHU', ten: 'Ghi chú kết quả', mo: 'Học viên ghi vài dòng kết quả trước khi tích hoàn thành' },
  { ma: 'DUONG_DAN', ten: 'Đường dẫn', mo: 'Học viên dán liên kết (Miro, Drive, thẻ Chiêu thức 2…)' },
];

/** Một tệp đã nộp trong bucket bhy-training */
export interface TtcTep {
  path: string;
  ten: string;
  kich_thuoc: number;
  luc: string;
}

export interface TtcTienDo {
  id: string;
  dau_viec_id: string;
  nguoi: string;
  hoan_thanh: boolean;
  thoi_diem: string | null;
  ghi_chu: string | null;
  file_url: string | null;
  tep: TtcTep[];
  duong_dan: string | null;
}

/**
 * Còn thiếu gì trước khi tích hoàn thành — trùng từng chữ với trigger
 * f_ttc_tien_do_truoc_ghi ở máy chủ để câu báo trên màn và câu báo từ máy chủ
 * là một.
 */
export function thieuDeTich(
  v: Pick<TtcDauViec, 'tinh_nang'>,
  td: Partial<Pick<TtcTienDo, 'tep' | 'ghi_chu' | 'duong_dan'>> | null | undefined,
): string[] {
  const thieu: string[] = [];
  const tn = v.tinh_nang ?? [];
  if (tn.includes('NOP_TEP') && (td?.tep ?? []).length === 0) thieu.push('tệp đính kèm');
  if (tn.includes('GHI_CHU') && (td?.ghi_chu ?? '').trim().length < 10) thieu.push('ghi chú kết quả (≥ 10 ký tự)');
  if (tn.includes('DUONG_DAN') && !(td?.duong_dan ?? '').trim()) thieu.push('đường dẫn');
  return thieu;
}

export interface TtcDiemBloom {
  id: string;
  ngay_id: string;
  hoc_vien: string;
  nguoi_cham: string;
  b1: number; b2: number; b3: number; b4: number; b5: number; b6: number;
  tru_hinh_thuc: number;
  tong: number;
  nhan_xet: string | null;
  cong_bo: boolean;
  cham_luc: string;
}

export interface TtcTuSoi {
  id: string;
  chuong_trinh_id: string;
  nguoi: string;
  dot: 1 | 2;
  muc: (number | null)[];
  vi_du: (string | null)[];
  dung_lai: string | null;
  bat_dau: string | null;
  tiep_tuc: string | null;
  cam_ket: string | null;
  cap_nhat_luc: string;
}

export interface TtcSuyNgam {
  id: string;
  ngay_id: string;
  nguoi: string;
  noi_dung: string;
  muc_tu_cham: number | null;
  thoi_diem: string;
}

// ---------------------------------------------------------------------------
// PHIẾU GIAO VIỆC BẢY Ô — «Bản mô tả yêu cầu sửa» của Giám đốc 06/09/2026
//
// Phiếu này là 5W2H rút gọn cho tình huống giao việc, bổ sung điểm Check của
// PDCA. Bảy ô bắt buộc: VÌ SAO (Why) · VIỆC GÌ (What + Where) · AI LÀM (Who) ·
// ĐẠT CHUẨN (Standard) · HẠN NỘP (When) · ĐIỂM KIỂM (Checkpoint) · MỨC GIAO.
// Hai ô tuỳ chọn: GỢI Ý CÁCH LÀM (How) · NGUỒN LỰC (How much).
// Tên trường dữ liệu giữ nguyên (không đổi tên để khỏi vỡ dữ liệu) — chỉ nhãn
// hiển thị là tiếng Việt.
// ---------------------------------------------------------------------------

export const TTC_PHIEU_CHU_THICH = 'Phiếu này là 5W2H rút gọn cho tình huống giao việc, bổ sung điểm Check của PDCA.';

export type TtcMucGiao = 'M1' | 'M2' | 'M3';

export const TTC_MUC_GIAO: Array<{ ma: TtcMucGiao; ten: string; mo: string }> = [
  { ma: 'M1', ten: 'Làm theo hướng dẫn', mo: 'Cán bộ làm theo cách đã chỉ, báo cáo từng bước.' },
  { ma: 'M2', ten: 'Tự làm, báo phương án trước', mo: 'Cán bộ tự nghĩ cách, trình phương án rồi mới thực hiện.' },
  { ma: 'M3', ten: 'Tự làm, báo kết quả', mo: 'Cán bộ tự quyết cách làm, chỉ báo lại kết quả cuối.' },
];

export function tenMucGiao(ma: TtcMucGiao | null | undefined): string {
  const m = TTC_MUC_GIAO.find((x) => x.ma === ma);
  return m ? `${m.ma} — ${m.ten}` : '—';
}

/** Nhãn hiển thị của bảy ô bắt buộc + hai ô tuỳ chọn — DÙNG ĐÚNG NGUYÊN VĂN bản mô tả */
export const TTC_O_PHIEU = {
  viSao: { nhan: 'VÌ SAO', en: 'Why', goiY: 'Việc này phục vụ mục tiêu nào của Phòng? Đừng ghi "theo chỉ đạo của trên".' },
  viecGi: { nhan: 'VIỆC GÌ', en: 'What', goiY: 'Sản phẩm cuối cùng là gì — file nào, báo cáo nào, danh sách nào? Ghi rõ phạm vi: địa bàn, thời kỳ số liệu, nguồn dữ liệu.' },
  aiLam: { nhan: 'AI LÀM', en: 'Owner', goiY: 'Một cái tên, một người chịu trách nhiệm. Không ghi tên tổ hay tên phòng.' },
  datChuan: { nhan: 'ĐẠT CHUẨN', en: 'Standard', goiY: 'Nhìn vào đâu để nói được là xong? Mỗi dòng một tiêu chí đo được.' },
  hanNop: { nhan: 'HẠN NỘP', en: 'Deadline', goiY: 'Ngày và giờ cụ thể.' },
  diemKiem: { nhan: 'ĐIỂM KIỂM', en: 'Checkpoint', goiY: 'Ngày nào tôi xem giữa chừng? Đặt trước hạn nộp để còn kịp sửa.' },
  mucGiao: { nhan: 'MỨC GIAO', en: '', goiY: 'Chọn mức uỷ quyền phù hợp với năng lực hiện tại của cán bộ.' },
  goiYCachLam: { nhan: 'GỢI Ý CÁCH LÀM', en: 'How', goiY: 'Chỉ điền cho cán bộ mới hoặc việc có rủi ro tuân thủ. Với cán bộ đã vững, để trống là có chủ ý — đó là khoảng trống để cán bộ tự nghĩ.' },
  nguonLuc: { nhan: 'NGUỒN LỰC', en: 'How much', goiY: 'Chi phí, người hỗ trợ, công cụ cần cấp thêm.' },
} as const;

export const TTC_VI_SAO_BAY_O = `Bảy ô này lấy từ 5W2H mà Chi nhánh đang dùng:

  VÌ SAO   ← Why        AI LÀM   ← Who        HẠN NỘP ← When
  VIỆC GÌ  ← What + Where

Hai ô 5W2H còn lại không bắt buộc:
  Cách làm (How) và Nguồn lực (How much) chỉ điền khi thật sự cần.
  Nếu lúc nào cũng chỉ luôn cách làm thì đó là chỉ việc, không phải giao việc.

Hai ô thêm mới, lấy từ PDCA:
  ĐẠT CHUẨN  — không có ô này thì đến lúc nghiệm thu hai bên cãi nhau,
               người giao bảo chưa được, người làm bảo đã xong.
  ĐIỂM KIỂM  — không có ô này thì phát hiện hỏng vào đúng ngày hết hạn,
               không còn thời gian sửa.`;

export type TtcKetQuaDiemKiem = 'chua_toi' | 'dung_tien_do' | 'cham_tien_do' | null;
export interface TtcDiemKiem { ngay: string; ket_qua: TtcKetQuaDiemKiem; ghi_chu: string }
export interface TtcLichSuChuan { thoi_diem: string; chuan_cu: string[]; chuan_moi: string[]; ly_do: string }
export type TtcTrangThaiPhieu = 'phai_lam' | 'dang_lam' | 'hoan_thanh';
export type TtcKetQuaNghiemThu = 'dat' | 'chua_dat';

/**
 * Ba việc gối đầu — «3 việc lựa chọn với cán bộ». Thẻ việc THẬT có thể liên
 * kết sang Chiêu thức 2 (`dau_viec_id`) để cán bộ ghi nhịp; phiếu giao việc và
 * kỷ luật khoá chuẩn, nghiệm thu nằm ở đây. Tên trường cũ (muc_dich · dau_ra ·
 * can_bo · tieu_chuan · han · moc_kiem_tra · nghiem_thu) giữ nguyên; các cột
 * mới theo Mục 5 của bản mô tả.
 */
export interface TtcViecGoiDau {
  id: string;
  chuong_trinh_id: string;
  hoc_vien: string;
  so: 1 | 2 | 3;
  /** Tên sản phẩm — tiêu đề thẻ Kanban, dạng ngắn của ô VIỆC GÌ */
  ten: string;
  /** Ô 1 — VÌ SAO (Why) */
  muc_dich: string | null;
  /** Ô 2 — VIỆC GÌ (What + Where) */
  dau_ra: string | null;
  /** Ô 3 — AI LÀM (Owner): profile_id của đúng một cán bộ */
  can_bo: string | null;
  /** Ô 4 — ĐẠT CHUẨN (Standard): mỗi phần tử một tiêu chí đo được */
  dat_chuan: string[];
  /** Ô 5 — HẠN NỘP (Deadline): ISO datetime, bắt buộc có giờ */
  han_nop: string | null;
  /** Ô 6 — ĐIỂM KIỂM (Checkpoint): tối thiểu 1 mốc, mọi mốc trước hạn */
  diem_kiem: TtcDiemKiem[];
  /** Ô 7 — MỨC GIAO */
  muc_giao: TtcMucGiao | null;
  /** Tuỳ chọn — How; bắt buộc nếu muc_giao = M1 */
  goi_y_cach_lam: string | null;
  /** Tuỳ chọn — How much */
  nguon_luc: string | null;
  /** Cột Kanban của phiếu */
  trang_thai: TtcTrangThaiPhieu;
  /** true sau khi bấm «Giao việc» — ĐẠT CHUẨN chuyển sang chỉ đọc */
  khoa_chuan: boolean;
  lich_su_chuan: TtcLichSuChuan[];
  /** Nghiệm thu: hai kết quả, không có «đạt một phần» */
  nghiem_thu_ket_qua: TtcKetQuaNghiemThu | null;
  /** Nhận xét nghiệm thu (≥ 30 ký tự) — cột cũ giữ tên */
  nghiem_thu: string | null;
  nguoi_nghiem_thu: string | null;
  nghiem_thu_luc: string | null;
  so_lan_nghiem_thu: number;
  hoi_lai_giua_chung: boolean | null;
  muc_giao_cuoi_ky: TtcMucGiao | null;
  /** Liên kết thẻ Chiêu thức 2 (tuỳ chọn) */
  dau_viec_id: string | null;
  ket_qua: string | null;
  /** Cột cũ, trigger tự đồng bộ từ dat_chuan / han_nop / diem_kiem */
  tieu_chuan: string | null;
  han: string | null;
  moc_kiem_tra: string | null;
  updated_at: string;
}

/** Bảy ô + hai ô tuỳ chọn ở dạng form (chưa lưu) */
export type TtcPhieuForm = Pick<TtcViecGoiDau,
  'ten' | 'muc_dich' | 'dau_ra' | 'can_bo' | 'dat_chuan' | 'han_nop' | 'diem_kiem' | 'muc_giao' | 'goi_y_cach_lam' | 'nguon_luc'>
  & { /** Họ tên cán bộ đã chọn — để kiểm tra luật «một người» */ ten_can_bo?: string | null };

export const TTC_PHIEU_TRONG = (): TtcPhieuForm => ({
  ten: '', muc_dich: '', dau_ra: '', can_bo: null, dat_chuan: ['', ''], han_nop: null,
  diem_kiem: [], muc_giao: null, goi_y_cach_lam: null, nguon_luc: null, ten_can_bo: null,
});

export interface KetQuaKiemTraPhieu {
  /** Chặn — không cho lưu (chữ đỏ) */
  chan: Array<{ o: keyof typeof TTC_O_PHIEU | 'tieuDe'; loi: string }>;
  /** Cảnh báo — vẫn cho lưu (chữ vàng) */
  canhBao: Array<{ o: keyof typeof TTC_O_PHIEU | 'tieuDe'; loi: string }>;
}

const TU_HANH_DONG = ['rà soát', 'nghiên cứu', 'tìm hiểu', 'triển khai', 'đẩy mạnh', 'tăng cường', 'phối hợp', 'theo dõi', 'quan tâm', 'chú trọng', 'nâng cao'];
const CUM_TAP_THE = ['phòng', 'tổ ', 'bộ phận', 'các cán bộ', 'toàn thể', 'nhóm'];
const CUM_CHUAN_RONG = ['đảm bảo chất lượng', 'đúng quy định', 'hoàn thành tốt', 'theo yêu cầu', 'đầy đủ', 'chính xác'];

export const TTC_LOI_PHIEU = {
  tieuDe: 'Đây là một hành động, chưa phải một sản phẩm. Thử đặt lại tên theo thứ sẽ nộp: "Bản đồ KCN và thị phần", "Danh sách 30 khách hàng", "Quy trình rút gọn 3 bước".',
  aiLam: 'Giao việc phải có đúng một người chịu trách nhiệm cuối cùng. Giao cho một tập thể thì thường không ai làm. Nếu cần nhiều người, chọn một người chủ trì và ghi những người còn lại vào ô NGUỒN LỰC.',
  datChuan: 'Chuẩn phải nhìn được, đếm được hoặc đối chiếu được. Ví dụ: "đủ 30 doanh nghiệp, mỗi doanh nghiệp có 6 trường thông tin", "số liệu khớp với báo cáo Core ngày 31/8", "trình bày được trong 10 phút".',
  hanNop: 'Ghi thêm giờ. "Cuối tuần" hay "trong tuần tới" là chỗ để việc trôi.',
  diemKiem: 'Đặt ít nhất một điểm kiểm trước hạn. Kiểm giữa chừng để còn kịp sửa, không phải để bắt lỗi.',
  mucGiao: 'Mức M1 nghĩa là cán bộ làm theo hướng dẫn. Vậy phải ghi hướng dẫn vào ô GỢI Ý CÁCH LÀM.',
} as const;

function chuThuong(s: string | null | undefined): string {
  return (s ?? '').normalize('NFC').toLowerCase().trim();
}

/** Tên có phải tập thể / hai người nối nhau không (Mục 7.2) */
export function laTapThe(ten: string | null | undefined): boolean {
  const t = chuThuong(ten);
  if (!t) return false;
  if (CUM_TAP_THE.some((c) => t.includes(c))) return true;
  if (t.includes(',')) return true;
  return /\s(và)\s/.test(t);
}

/** Toàn bộ chuẩn chỉ gồm các cụm rỗng nghĩa (Mục 7.3) */
export function chuanRongNghia(dong: string): boolean {
  let t = chuThuong(dong);
  for (const c of CUM_CHUAN_RONG) t = t.split(c).join(' ');
  // Từ nối không mang nội dung — «đảm bảo chất lượng và đúng quy định» vẫn là rỗng.
  // Tách token thay vì dùng \b: \b của JS chỉ hiểu chữ ASCII nên «và», «đúng» không khớp.
  const TU_NOI = new Set(['và', 'các', 'những', 'cho', 'được', 'là', 'về', 'phải', 'cần', 'theo', 'đúng', 'tốt']);
  return t.split(/[\s.,;:·\-–—()]+/).filter((tu) => tu && !TU_NOI.has(tu)).length === 0;
}

/** Ngày 'YYYY-MM-DD' theo giờ Việt Nam của một mốc ISO */
export function ngayVnCuaIso(iso: string): string {
  return ngayVnChuoi(new Date(iso));
}

/**
 * Quy tắc kiểm tra khi lưu (Mục 7). `nhanCanBo` là họ tên cán bộ đã chọn, vì ô
 * AI LÀM chọn từ danh bạ nên tên tập thể chỉ có thể lọt qua dữ liệu danh bạ.
 */
export function kiemTraPhieu(f: TtcPhieuForm, homNay: string = ngayVnChuoi(new Date())): KetQuaKiemTraPhieu {
  const chan: KetQuaKiemTraPhieu['chan'] = [];
  const canhBao: KetQuaKiemTraPhieu['canhBao'] = [];

  const tieuDe = chuThuong(f.ten);
  if (!tieuDe || tieuDe.length < 5) chan.push({ o: 'tieuDe', loi: 'Ghi tên sản phẩm (tối thiểu 5 ký tự).' });
  else if (TU_HANH_DONG.some((tu) => tieuDe.startsWith(tu))) canhBao.push({ o: 'tieuDe', loi: TTC_LOI_PHIEU.tieuDe });

  if (!chuThuong(f.muc_dich)) chan.push({ o: 'viSao', loi: 'Ghi vì sao cần làm việc này.' });
  if (!chuThuong(f.dau_ra)) chan.push({ o: 'viecGi', loi: 'Ghi sản phẩm cuối cùng và phạm vi.' });

  if (!f.can_bo) chan.push({ o: 'aiLam', loi: TTC_LOI_PHIEU.aiLam });
  else if (laTapThe(f.ten_can_bo)) chan.push({ o: 'aiLam', loi: TTC_LOI_PHIEU.aiLam });

  const chuan = (f.dat_chuan ?? []).map((d) => d.trim()).filter(Boolean);
  if (chuan.length === 0 || chuan.some((d) => d.length < 15) || chuan.every(chuanRongNghia)) {
    chan.push({ o: 'datChuan', loi: TTC_LOI_PHIEU.datChuan });
  }

  const coGio = !!f.han_nop && !Number.isNaN(Date.parse(f.han_nop));
  if (!coGio) chan.push({ o: 'hanNop', loi: TTC_LOI_PHIEU.hanNop });

  const moc = (f.diem_kiem ?? []).filter((m) => m.ngay);
  const ngayHan = coGio ? ngayVnCuaIso(f.han_nop!) : null;
  if (moc.length === 0 || (ngayHan && moc.some((m) => m.ngay >= ngayHan))) {
    chan.push({ o: 'diemKiem', loi: TTC_LOI_PHIEU.diemKiem });
  }

  if (!f.muc_giao) chan.push({ o: 'mucGiao', loi: 'Bắt buộc chọn mức giao.' });
  else if (f.muc_giao === 'M1' && !chuThuong(f.goi_y_cach_lam)) chan.push({ o: 'mucGiao', loi: TTC_LOI_PHIEU.mucGiao });

  void homNay;
  return { chan, canhBao };
}

/** Mốc điểm kiểm gợi ý ở ~60% quãng từ hôm nay đến hạn (Mục 7.5), không sớm hơn ngày mai, không trùng ngày hạn */
export function goiYDiemKiem(hanNopIso: string, homNay: string = ngayVnChuoi(new Date())): string | null {
  if (!hanNopIso || Number.isNaN(Date.parse(hanNopIso))) return null;
  const ngayHan = ngayVnCuaIso(hanNopIso);
  const bd = Date.UTC(+homNay.slice(0, 4), +homNay.slice(5, 7) - 1, +homNay.slice(8, 10));
  const kt = Date.UTC(+ngayHan.slice(0, 4), +ngayHan.slice(5, 7) - 1, +ngayHan.slice(8, 10));
  const soNgay = Math.round((kt - bd) / 86_400_000);
  if (soNgay <= 1) return null;
  const lech = Math.min(soNgay - 1, Math.max(1, Math.round(soNgay * 0.6)));
  const d = new Date(bd + lech * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Bảy ô còn thiếu — dùng cho thông báo «Thẻ chưa đủ thông tin để giao. Còn thiếu: …» */
export function oConThieu(g: TtcPhieuForm): string[] {
  const kq = kiemTraPhieu(g);
  const ten: Record<string, string> = {
    tieuDe: 'Tên sản phẩm', viSao: 'VÌ SAO', viecGi: 'VIỆC GÌ', aiLam: 'AI LÀM', datChuan: 'ĐẠT CHUẨN',
    hanNop: 'HẠN NỘP', diemKiem: 'ĐIỂM KIỂM', mucGiao: 'MỨC GIAO',
  };
  return [...new Set(kq.chan.map((c) => ten[c.o] ?? c.o))];
}

/** Điều kiện chuyển cột (Mục 10). Trả null khi được phép, ngược lại là câu thông báo. */
export function chuyenCotPhieu(g: TtcViecGoiDau, dich: TtcTrangThaiPhieu): string | null {
  if (g.trang_thai === dich) return null;
  if (g.trang_thai === 'hoan_thanh') return 'Thẻ đã nghiệm thu. Nếu cần mở lại, dùng nút Mở lại nghiệm thu.';
  if (dich === 'dang_lam') {
    const thieu = oConThieu(g);
    if (!g.khoa_chuan) thieu.push('bấm «Giao việc» để khoá chuẩn');
    return thieu.length ? `Thẻ chưa đủ thông tin để giao. Còn thiếu: ${thieu.join(', ')}` : null;
  }
  if (dich === 'hoan_thanh') {
    return g.nghiem_thu_ket_qua === 'dat' ? null : 'Thẻ chỉ được chuyển sang Hoàn thành sau khi nghiệm thu Đạt.';
  }
  return null;
}

/** Nhãn trạng thái thẻ (Mục 11.2) */
export function nhanTrangThaiPhieu(g: TtcViecGoiDau | null): string {
  if (!g) return 'Chưa lập phiếu';
  const ngay = (iso: string | null) => (iso ? ngayVnCuaIso(iso).split('-').reverse().slice(0, 2).join('/') : '');
  if (g.nghiem_thu_ket_qua === 'dat') return `Nghiệm thu Đạt · ${ngay(g.nghiem_thu_luc)}`;
  if (g.nghiem_thu_ket_qua === 'chua_dat') return `Nghiệm thu Chưa đạt · ${ngay(g.nghiem_thu_luc)} · làm lại`;
  if (g.khoa_chuan) return `Đang chạy · hạn ${ngay(g.han_nop)}`;
  return 'Đã lập · chưa giao';
}

export interface TrangThaiDiemKiem { chu: string; muc: 'TRUNG_TINH' | 'CANH_BAO' | 'DO' }

/** Dòng trạng thái điểm kiểm trên mặt thẻ ở cột Đang làm (Mục 10) */
export function trangThaiDiemKiem(g: Pick<TtcViecGoiDau, 'diem_kiem'>, homNay: string = ngayVnChuoi(new Date())): TrangThaiDiemKiem | null {
  const ds = [...(g.diem_kiem ?? [])].filter((m) => m.ngay).sort((a, b) => a.ngay.localeCompare(b.ngay));
  if (ds.length === 0) return null;
  const nhan = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
  const cham = ds.find((m) => m.ket_qua === 'cham_tien_do');
  if (cham) return { chu: `Chậm tiến độ tại mốc ${nhan(cham.ngay)}`, muc: 'DO' };
  const quaMoc = ds.find((m) => m.ngay < homNay && m.ket_qua == null);
  if (quaMoc) return { chu: `Quá điểm kiểm ${nhan(quaMoc.ngay)} · chưa ghi nhận`, muc: 'CANH_BAO' };
  const sapToi = ds.find((m) => m.ngay >= homNay && m.ket_qua == null);
  if (sapToi) return { chu: `Điểm kiểm ${nhan(sapToi.ngay)}`, muc: 'TRUNG_TINH' };
  return { chu: `Đã qua ${ds.length} điểm kiểm`, muc: 'TRUNG_TINH' };
}

/** Đúng hạn hay chậm — tự tính từ hạn nộp và thời điểm nghiệm thu (Mục 9.4) */
export function dungHan(g: Pick<TtcViecGoiDau, 'han_nop' | 'nghiem_thu_luc'>): boolean | null {
  if (!g.han_nop || !g.nghiem_thu_luc) return null;
  return Date.parse(g.nghiem_thu_luc) <= Date.parse(g.han_nop);
}

/** Dòng so sánh mức giao đầu kỳ → cuối kỳ (Mục 9.5) */
export function cauSoSanhMucGiao(dau: TtcMucGiao | null, cuoi: TtcMucGiao | null): string | null {
  if (!dau || !cuoi) return null;
  return `Mức giao đầu kỳ: ${dau} → Mức giao cuối kỳ: ${cuoi}. ${dau === cuoi ? 'Mức uỷ quyền chưa đổi sau mười ngày.' : 'Đây là kết quả kèm cặp đo được sau mười ngày.'}`;
}

/** Số thứ tự việc gối đầu (1–3) theo mã thẻ Chiêu thức 2 — để gắn huy hiệu lên thẻ */
export function huyHieuGoiDau(dsGoiDau: Array<Pick<TtcViecGoiDau, 'so' | 'dau_viec_id'>>): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of dsGoiDau) if (g.dau_viec_id) m.set(g.dau_viec_id, g.so);
  return m;
}

/** Bảy ô bắt buộc của một phiếu đã đủ chưa (không tính cảnh báo) */
export function goiDauDuTruong(g: TtcPhieuForm): boolean {
  return kiemTraPhieu(g).chan.length === 0;
}

// ---------------------------------------------------------------------------
// Phiếu tự soi — 08 tiêu chí trưởng thành (Khung chia sẻ và tự suy ngẫm 1.0)
// ---------------------------------------------------------------------------

export interface TieuChiTuSoi {
  so: number;
  ten: string;
  muc1: string;
  muc3: string;
  muc5: string;
}

/**
 * Tám tiêu chí, ba mức mô tả rõ (1/3/5); mức 2 và 4 là bước trung gian. Không
 * có mức nào là mức xấu — thang mô tả vị trí hiện tại, không xếp loại con người.
 */
export const TTC_TIEU_CHI_TU_SOI: TieuChiTuSoi[] = [
  {
    so: 1, ten: 'Chủ động',
    muc1: 'Làm khi được giao và làm đúng phần được giao.',
    muc3: 'Tự phát hiện việc cần làm và đề xuất phương án trước khi được yêu cầu.',
    muc5: 'Phát hiện vấn đề của hệ thống và đề xuất cải tiến trước khi hậu quả phát sinh.',
  },
  {
    so: 2, ten: 'Kỷ luật',
    muc1: 'Hoàn thành sau khi được nhắc.',
    muc3: 'Tự đặt hạn và giữ đúng hạn mà không cần ai nhắc.',
    muc5: 'Giữ chuẩn ngay cả khi không ai kiểm tra, và thiết lập chuẩn đó thành nếp chung của Phòng.',
  },
  {
    so: 3, ten: 'Học tập',
    muc1: 'Học khi được cử đi đào tạo.',
    muc3: 'Tự tìm nguồn học cho đúng khoảng trống của mình.',
    muc5: 'Biến việc học thành sản phẩm dùng được cho cả Phòng: tài liệu, checklist, buổi chia sẻ.',
  },
  {
    so: 4, ten: 'Giải quyết vấn đề',
    muc1: 'Báo cáo vấn đề lên cấp trên và chờ hướng xử lý.',
    muc3: 'Báo cáo kèm hai phương án và một khuyến nghị có căn cứ.',
    muc5: 'Xử lý trong thẩm quyền và sửa nguyên nhân gốc để vấn đề không lặp lại.',
  },
  {
    so: 5, ten: 'Trách nhiệm',
    muc1: 'Nhận trách nhiệm phần việc của mình.',
    muc3: 'Nhận trách nhiệm kết quả chung của nhóm, kể cả khi sai sót do người khác.',
    muc5: 'Nhận trách nhiệm về việc hệ thống đã để sai sót xảy ra, và sửa hệ thống đó.',
  },
  {
    so: 6, ten: 'Hợp tác',
    muc1: 'Phối hợp khi được yêu cầu.',
    muc3: 'Chủ động kết nối các bên để việc chung chạy được.',
    muc5: 'Thiết kế cơ chế phối hợp để công việc không còn phụ thuộc vào quan hệ cá nhân.',
  },
  {
    so: 7, ten: 'Phát triển người',
    muc1: 'Tập trung làm tốt việc của mình.',
    muc3: 'Hướng dẫn khi cán bộ hỏi, và làm mẫu khi cần.',
    muc5: 'Có kế hoạch phát triển riêng cho từng cán bộ và đo được mức tiến bộ của họ.',
  },
  {
    so: 8, ten: 'Tư duy hệ thống',
    muc1: 'Nhìn từng việc riêng lẻ.',
    muc3: 'Nhìn được chuỗi việc và chỉ ra điểm đang tắc.',
    muc5: 'Nhìn đủ sáu đòn bẩy — mục tiêu, cơ cấu, quy trình, cơ chế, kiểm soát, văn hoá — và biết chọn đòn bẩy nào để tác động.',
  },
];

// ---------------------------------------------------------------------------
// Barem 06 thang Bloom (100 điểm, chấm mỗi ngày 2–9)
// ---------------------------------------------------------------------------

export interface ThangBloom {
  ma: 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6';
  so: number;
  ten: string;
  toiDa: number;
  dat: string;
  chuaDat: string;
}

export const TTC_THANG_BLOOM: ThangBloom[] = [
  {
    ma: 'b1', so: 1, ten: 'Nhớ', toiDa: 10,
    dat: 'Nêu đúng số hiệu, ngày ban hành, hiệu lực, phạm vi và đối tượng áp dụng mà không nhìn tài liệu.',
    chuaDat: 'Phải mở văn bản mới nói được; nhầm phạm vi áp dụng.',
  },
  {
    ma: 'b2', so: 2, ten: 'Hiểu', toiDa: 15,
    dat: 'Diễn giải bằng ngôn ngữ của mình; chỉ ra ĐIỂM THAY ĐỔI so với quy định trước.',
    chuaDat: 'Đọc lại nguyên văn; không chỉ ra được cái gì mới.',
  },
  {
    ma: 'b3', so: 3, ten: 'Vận dụng', toiDa: 20,
    dat: 'Áp vào ít nhất 02 tình huống thật của Phòng KHDN BHY, có tên nhóm khách hàng hoặc loại hồ sơ cụ thể.',
    chuaDat: 'Ví dụ chung chung, không gắn với khách hàng hay hồ sơ nào của Chi nhánh.',
  },
  {
    ma: 'b4', so: 4, ten: 'Phân tích', toiDa: 20,
    dat: 'Tách được: khách hàng nào bị ảnh hưởng, RM nào phải đổi cách làm, bước nào trong quy trình phải sửa, câu nào dễ hiểu sai.',
    chuaDat: 'Chỉ liệt kê nội dung theo thứ tự văn bản.',
  },
  {
    ma: 'b5', so: 5, ten: 'Đánh giá', toiDa: 20,
    dat: 'Nêu điểm mạnh và điểm chưa rõ của văn bản; nêu rủi ro khi triển khai và điều kiện khiến cách hiểu phải thay đổi.',
    chuaDat: 'Chỉ khen văn bản hoặc chỉ nêu khó khăn mà không có căn cứ.',
  },
  {
    ma: 'b6', so: 6, ten: 'Sáng tạo', toiDa: 15,
    dat: 'Đề xuất phương án triển khai tại Phòng: ai làm gì, checklist, bộ Quizizz, mốc kiểm tra, cách đo hiểu đúng.',
    chuaDat: 'Đề xuất dừng ở mức «sẽ phổ biến cho anh em».',
  },
];

/** Trừ hình thức slide và kỷ luật thời gian — tối đa 5 điểm, không cộng */
export const TTC_TRU_HINH_THUC_TOI_DA = 5;

/** Ngưỡng «cấu phần cần củng cố»: một thang dưới 60% điểm tối đa (mốc thông báo 4) */
export const TTC_NGUONG_CUNG_CO = 0.6;

export function tongDiemBloom(d: Pick<TtcDiemBloom, 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'tru_hinh_thuc'>): number {
  const tong = d.b1 + d.b2 + d.b3 + d.b4 + d.b5 + d.b6 - d.tru_hinh_thuc;
  return Math.max(0, Math.min(100, tong));
}

/** Các thang chấm dưới 60% điểm tối đa — cùng luật với trigger ở database */
export function thangCanCungCo(d: Pick<TtcDiemBloom, 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6'>): ThangBloom[] {
  return TTC_THANG_BLOOM.filter((t) => d[t.ma] < t.toiDa * TTC_NGUONG_CUNG_CO);
}

/** Điểm từng thang có nằm trong khung 0..tối đa không */
export function diemBloomHopLe(d: Pick<TtcDiemBloom, 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'tru_hinh_thuc'>): boolean {
  if (d.tru_hinh_thuc < 0 || d.tru_hinh_thuc > TTC_TRU_HINH_THUC_TOI_DA) return false;
  return TTC_THANG_BLOOM.every((t) => Number.isInteger(d[t.ma]) && d[t.ma] >= 0 && d[t.ma] <= t.toiDa);
}

// ---------------------------------------------------------------------------
// Trạng thái đầu việc và ngày
// ---------------------------------------------------------------------------

/** Trạng thái một đầu việc trên lịch (đặc tả Mục VII) */
export type TtcTrangThaiViec = 'CHUA_MO' | 'DANG_LAM' | 'HOAN_THANH' | 'DA_DANH_GIA';

export const TTC_TEN_TRANG_THAI: Record<TtcTrangThaiViec, string> = {
  CHUA_MO: 'Chưa mở',
  DANG_LAM: 'Đang làm',
  HOAN_THANH: 'Hoàn thành',
  DA_DANH_GIA: 'Đã đánh giá',
};

/**
 * Ngày chưa tới → chưa mở (xem trước được, chưa tích được). Đã tới ngày mà chưa
 * tích → đang làm. Học viên tích → hoàn thành. Có phiếu chấm cho ngày → đã đánh giá.
 */
export function trangThaiViec(
  ngay: Pick<TtcNgay, 'ngay'>,
  tienDo: Pick<TtcTienDo, 'hoan_thanh'> | null | undefined,
  daCham: boolean,
  homNay: string = ngayVnChuoi(new Date()),
): TtcTrangThaiViec {
  if (tienDo?.hoan_thanh) return daCham ? 'DA_DANH_GIA' : 'HOAN_THANH';
  if (ngay.ngay > homNay) return 'CHUA_MO';
  return 'DANG_LAM';
}

/** Học viên chỉ tích được khi ngày đã tới (không tích trước, không khoá ngày đã qua) */
export function tichDuoc(ngay: Pick<TtcNgay, 'ngay'>, homNay: string = ngayVnChuoi(new Date())): boolean {
  return ngay.ngay <= homNay;
}

/** Ngày đang chọn mặc định khi mở Lộ trình: hôm nay nếu trong đợt, ngày đầu nếu chưa tới, ngày cuối nếu đã qua */
export function ngayMacDinh(ds: TtcNgay[], homNay: string = ngayVnChuoi(new Date())): TtcNgay | null {
  if (ds.length === 0) return null;
  const sap = [...ds].sort((a, b) => a.so_thu_tu - b.so_thu_tu);
  const trung = sap.find((n) => n.ngay === homNay);
  if (trung) return trung;
  if (homNay < sap[0].ngay) return sap[0];
  const daQua = sap.filter((n) => n.ngay < homNay);
  // Giữa hai ngày của đợt (VD cuối tuần) → ngày kế tiếp để chuẩn bị tối hôm trước
  const keTiep = sap.find((n) => n.ngay > homNay);
  return keTiep ?? daQua[daQua.length - 1] ?? sap[0];
}

export interface TienDoNgay {
  tong: number;
  xong: number;
  /** Đủ toàn bộ đầu việc — chính là điều kiện mốc thông báo 1 */
  du: boolean;
}

export function tienDoNgay(
  dsViec: Array<Pick<TtcDauViec, 'id'>>,
  tienDo: Array<Pick<TtcTienDo, 'dau_viec_id' | 'hoan_thanh'>>,
): TienDoNgay {
  const xongIds = new Set(tienDo.filter((t) => t.hoan_thanh).map((t) => t.dau_viec_id));
  const xong = dsViec.filter((v) => xongIds.has(v.id)).length;
  return { tong: dsViec.length, xong, du: dsViec.length > 0 && xong === dsViec.length };
}

// ---------------------------------------------------------------------------
// Lịch Ban Giám đốc — gom khung giờ cần GĐ/PGĐ có mặt, tính phút
// ---------------------------------------------------------------------------

/** 'HH:MM' → phút kể từ 0h; chuỗi hỏng trả 0 để không làm gãy cả bảng */
export function phutTuGio(gio: string): number {
  const [h, m] = (gio ?? '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function thoiLuongPhut(v: Pick<TtcDauViec, 'gio_bat_dau' | 'gio_ket_thuc'>): number {
  return Math.max(0, phutTuGio(v.gio_ket_thuc) - phutTuGio(v.gio_bat_dau));
}

/** Đầu việc này cần Giám đốc hay PGĐ có mặt không */
export function canBgd(v: Pick<TtcDauViec, 'nguoi_phu_trach'>): boolean {
  return v.nguoi_phu_trach === 'GD' || v.nguoi_phu_trach === 'PGD' || v.nguoi_phu_trach === 'GD_PGD';
}

export interface LichBgdNgay {
  ngay: TtcNgay;
  viec: TtcDauViec[];
  phutGd: number;
  phutPgd: number;
}

/**
 * Ngưỡng tải của Ban Giám đốc: không quá 60 phút mỗi người mỗi ngày, TRỪ ngày
 * đầu và ngày cuối (tiêu chí nghiệm thu giai đoạn 1). Màn hình chỉ tô cảnh báo,
 * không chặn — dữ liệu lịch phải phản ánh đúng chương trình đã duyệt.
 */
export const TTC_TRAN_PHUT_BGD = 60;

export function lichBgd(dsNgay: TtcNgay[], dsViec: TtcDauViec[]): LichBgdNgay[] {
  const theoNgay = new Map<string, TtcDauViec[]>();
  for (const v of dsViec) {
    if (!canBgd(v)) continue;
    const cu = theoNgay.get(v.ngay_id);
    if (cu) cu.push(v); else theoNgay.set(v.ngay_id, [v]);
  }
  return [...dsNgay]
    .sort((a, b) => a.so_thu_tu - b.so_thu_tu)
    .map((ngay) => {
      const viec = (theoNgay.get(ngay.id) ?? []).sort((a, b) => phutTuGio(a.gio_bat_dau) - phutTuGio(b.gio_bat_dau));
      const phut = (ai: 'GD' | 'PGD') => viec
        .filter((v) => v.nguoi_phu_trach === ai || v.nguoi_phu_trach === 'GD_PGD')
        .reduce((s, v) => s + thoiLuongPhut(v), 0);
      return { ngay, viec, phutGd: phut('GD'), phutPgd: phut('PGD') };
    });
}

/** Ngày này có vượt trần 60 phút cho người nào không (ngày đầu/cuối được miễn) */
export function vuotTranBgd(d: LichBgdNgay, soNgay: number): boolean {
  if (d.ngay.so_thu_tu === 1 || d.ngay.so_thu_tu === soNgay) return false;
  return d.phutGd > TTC_TRAN_PHUT_BGD || d.phutPgd > TTC_TRAN_PHUT_BGD;
}

export function tongGioCaDot(ds: LichBgdNgay[]): { gioGd: number; gioPgd: number } {
  const gd = ds.reduce((s, d) => s + d.phutGd, 0);
  const pgd = ds.reduce((s, d) => s + d.phutPgd, 0);
  return { gioGd: Math.round((gd / 60) * 10) / 10, gioPgd: Math.round((pgd / 60) * 10) / 10 };
}

// ---------------------------------------------------------------------------
// Bảng việc — Kanban 3 cột dùng chung cấu trúc với Chiêu thức 2
// ---------------------------------------------------------------------------

export type TtcCot = 'PHAI_LAM' | 'DANG_LAM' | 'HOAN_THANH';

export const TTC_COT: Array<{ ma: TtcCot; ten: string; icon: string }> = [
  { ma: 'PHAI_LAM', ten: 'Phải làm', icon: '📋' },
  { ma: 'DANG_LAM', ten: 'Đang làm', icon: '🔨' },
  { ma: 'HOAN_THANH', ten: 'Hoàn thành', icon: '✅' },
];

/**
 * Bảy trạng thái của Chiêu thức 2 gấp về ba cột của Bảng việc. Dùng lại đúng
 * luật `cotHienThi` của Chiêu thức 2 (chờ phối hợp/chờ duyệt vẫn là «đang làm»,
 * đã đóng vẫn là «hoàn thành») để một thẻ đứng cùng cột ở cả hai bàn.
 * Thẻ dừng/hủy không lên Bảng việc — đã dừng thì không còn là việc gối đầu.
 */
export function cotBangViec(trangThai: Ct2TrangThai): TtcCot | null {
  const c = cotHienThi(trangThai);
  if (c === 'CHUAN_BI') return 'PHAI_LAM';
  if (c === 'DANG_LAM') return 'DANG_LAM';
  if (c === 'HOAN_THANH') return 'HOAN_THANH';
  return null;
}

export function chiaCotBangViec(ds: Ct2DauViec[]): Map<TtcCot, Ct2DauViec[]> {
  const m = new Map<TtcCot, Ct2DauViec[]>(TTC_COT.map((c) => [c.ma, []]));
  for (const t of ds) {
    const cot = cotBangViec(t.trang_thai);
    if (cot) m.get(cot)!.push(t);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Tên file gửi email — NGAY[số]_[MÃ SẢN PHẨM]_[Họ tên viết liền].[đuôi]
// ---------------------------------------------------------------------------

function boDauVaGhepTen(hoTen: string): string {
  return hoTen
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .split(/\s+/).filter(Boolean)
    .map((tu) => tu[0].toUpperCase() + tu.slice(1))
    .join('');
}

/** VD: tenFileSanPham(2, 'PHIEUVANBAN', 'Đỗ Việt Anh', 'docx') → NGAY02_PHIEUVANBAN_DoVietAnh.docx */
export function tenFileSanPham(soNgay: number, maSanPham: string, hoTen: string, duoi: string): string {
  const ma = maSanPham.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `NGAY${String(soNgay).padStart(2, '0')}_${ma}_${boDauVaGhepTen(hoTen)}.${duoi.replace(/^\./, '')}`;
}

// ---------------------------------------------------------------------------
// Bốn mốc thông báo (đặc tả Mục V) — nhãn để chuông/push và tài liệu nói cùng một thứ
// ---------------------------------------------------------------------------

export const TTC_MA_SU_KIEN = {
  /** Học viên tích đủ toàn bộ đầu việc trong ngày → Giám đốc và PGĐ */
  DU_NGAY: 'TTC_DU_NGAY',
  /** 15:10 hằng ngày, 20 phút trước phiên trình bày → GĐ, PGĐ, học viên */
  SAP_TRINH_BAY: 'TTC_SAP_TRINH_BAY',
  /** 17:00 mà chưa đủ đầu việc → Giám đốc và PGĐ */
  CON_VIEC: 'TTC_CON_VIEC',
  /** Một thang Bloom dưới 60% → Giám đốc */
  CUNG_CO: 'TTC_CUNG_CO',
  /** X phút trước giờ bắt đầu của ngày — kiểm tra lại phần chuẩn bị → người do lần đào tạo chọn */
  SAP_BAT_DAU_NGAY: 'TTC_SAP_BAT_DAU_NGAY',
  /** X phút trước giờ kết thúc của một phần trong ngày → người do lần đào tạo chọn */
  SAP_HET_PHAN: 'TTC_SAP_HET_PHAN',
} as const;

// ---------------------------------------------------------------------------
// Nhắc trước giờ — cấu hình theo từng lần đào tạo (cột ttc_chuong_trinh.nhac)
// ---------------------------------------------------------------------------

export interface TtcMocNhac {
  bat: boolean;
  /** Số phút trước mốc */
  phut: number;
  /** Profile id những người nhận — chọn tay trong danh sách thành viên */
  nguoi: string[];
}

export interface TtcCauHinhNhac {
  /** Trước giờ bắt đầu của cả ngày (giờ đầu việc sớm nhất) */
  truoc_ngay: TtcMocNhac;
  /** Trước giờ kết thúc của từng phần (giờ kết thúc muộn nhất của phần) */
  truoc_het_phan: TtcMocNhac;
}

export const TTC_NHAC_MAC_DINH = (): TtcCauHinhNhac => ({
  truoc_ngay: { bat: false, phut: 30, nguoi: [] },
  truoc_het_phan: { bat: false, phut: 15, nguoi: [] },
});

/** Đọc jsonb từ máy chủ ra cấu hình đầy đủ — thiếu khoá nào lấy mặc định khoá đó */
export function docCauHinhNhac(json: unknown): TtcCauHinhNhac {
  const mac = TTC_NHAC_MAC_DINH();
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const doc = (k: keyof TtcCauHinhNhac): TtcMocNhac => {
    const m = (o[k] && typeof o[k] === 'object' ? o[k] : {}) as Record<string, unknown>;
    const phut = Number(m.phut);
    return {
      bat: m.bat === true,
      phut: Number.isFinite(phut) && phut >= 5 && phut <= 180 ? Math.round(phut) : mac[k].phut,
      nguoi: Array.isArray(m.nguoi) ? m.nguoi.filter((x): x is string => typeof x === 'string') : [],
    };
  };
  return { truoc_ngay: doc('truoc_ngay'), truoc_het_phan: doc('truoc_het_phan') };
}

export interface MocNhacTrongNgay {
  gio: string;
  loai: 'TRUOC_NGAY' | 'TRUOC_HET_PHAN';
  nhan: string;
}

/** Phút kể từ 0h → 'HH:MM' (âm thì kẹp về 00:00) */
export function gioTuPhut(phut: number): string {
  const p = Math.max(0, Math.round(phut));
  return `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;
}

/**
 * Các mốc sẽ nhắc trong một ngày lộ trình — cùng phép tính với ttc_nhac_theo_lich
 * ở máy chủ, để màn Lộ trình nói trước «hôm nay sẽ nhắc lúc…» đúng như máy chủ làm.
 */
export function mocNhacTrongNgay(
  dsViecCuaNgay: Array<Pick<TtcDauViec, 'phan' | 'gio_bat_dau' | 'gio_ket_thuc'>>,
  ch: TtcCauHinhNhac,
): MocNhacTrongNgay[] {
  if (dsViecCuaNgay.length === 0) return [];
  const ds: MocNhacTrongNgay[] = [];
  if (ch.truoc_ngay.bat && ch.truoc_ngay.nguoi.length > 0) {
    const batDau = Math.min(...dsViecCuaNgay.map((v) => phutTuGio(v.gio_bat_dau)));
    ds.push({ gio: gioTuPhut(batDau - ch.truoc_ngay.phut), loai: 'TRUOC_NGAY', nhan: `bắt đầu ngày (${gioTuPhut(batDau)})` });
  }
  if (ch.truoc_het_phan.bat && ch.truoc_het_phan.nguoi.length > 0) {
    for (const p of TTC_PHAN) {
      const cua = dsViecCuaNgay.filter((v) => v.phan === p.ma);
      if (cua.length === 0) continue;
      const ketThuc = Math.max(...cua.map((v) => phutTuGio(v.gio_ket_thuc)));
      ds.push({ gio: gioTuPhut(ketThuc - ch.truoc_het_phan.phut), loai: 'TRUOC_HET_PHAN', nhan: `hết phần ${p.ten} (${gioTuPhut(ketThuc)})` });
    }
  }
  return ds.sort((a, b) => a.gio.localeCompare(b.gio));
}

/** Tin của Training Center mở về đâu — cùng luật với duongDanThongBao (ct2.ts) và notify-ct2 */
export function laTinTrainingCenter(maSuKien: string): boolean {
  return maSuKien.startsWith('TTC_');
}

// ---------------------------------------------------------------------------
// Danh mục chương trình — Training Center là trung tâm NHIỀU chương trình
// ---------------------------------------------------------------------------

export interface NhomDanhMuc {
  nhom: (typeof TTC_NHOM_DOI_TUONG)[number];
  chuongTrinh: TtcChuongTrinh[];
}

const THU_TU_TRANG_THAI: Record<TtcTrangThaiCt, number> = { DANG_CHAY: 0, CHUAN_BI: 1, KET_THUC: 2 };

/**
 * Xếp danh mục theo bốn nhóm đối tượng (đủ cả nhóm chưa có chương trình để
 * TCTH thấy chỗ trống); trong nhóm: đang chạy → chuẩn bị (sắp tới trước) →
 * đã kết thúc (mới nhất trước).
 */
export function xepDanhMuc(ds: TtcChuongTrinh[]): NhomDanhMuc[] {
  return TTC_NHOM_DOI_TUONG.map((nhom) => ({
    nhom,
    chuongTrinh: ds
      .filter((c) => c.nhom_doi_tuong === nhom.ma)
      .sort((a, b) => {
        const t = THU_TU_TRANG_THAI[a.trang_thai] - THU_TU_TRANG_THAI[b.trang_thai];
        if (t !== 0) return t;
        return a.trang_thai === 'KET_THUC' ? b.ngay_bd.localeCompare(a.ngay_bd) : a.ngay_bd.localeCompare(b.ngay_bd);
      }),
  }));
}

/** Chương trình «của tôi» xếp đang chạy trước, rồi sắp tới, rồi đã xong */
export function xepChuongTrinhCuaToi(ds: TtcChuongTrinh[]): TtcChuongTrinh[] {
  return [...ds].sort((a, b) => {
    const t = THU_TU_TRANG_THAI[a.trang_thai] - THU_TU_TRANG_THAI[b.trang_thai];
    return t !== 0 ? t : a.ngay_bd.localeCompare(b.ngay_bd);
  });
}

/** Đường dẫn các màn của một chương trình — một nơi duy nhất, tab và thẻ cùng đọc */
export function duongDanChuongTrinh(id: string, man: '' | 'lo-trinh' | 'bang-viec' | 'tu-soi' | 'lich-bgd' = ''): string {
  return `/one/training-center/chuong-trinh/${id}${man ? `/${man}` : ''}`;
}

// ---------------------------------------------------------------------------
// Nhãn ngày
// ---------------------------------------------------------------------------

const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** '2026-09-07' → 'Thứ Hai 07/09'. Cắt chuỗi rồi dựng Date theo múi +07 để không lệch ngày. */
export function nhanNgay(ngay: string): string {
  const [y, m, d] = ngay.split('-').map(Number);
  if (!y || !m || !d) return ngay;
  const thu = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${THU[thu]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
