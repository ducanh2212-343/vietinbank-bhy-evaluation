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

export interface TtcChuongTrinh {
  id: string;
  ten: string;
  mo_ta: string | null;
  ngay_bd: string;
  ngay_kt: string;
  trang_thai: 'CHUAN_BI' | 'DANG_CHAY' | 'KET_THUC';
  /** Toạ độ + bán kính ghi nhận có mặt — giai đoạn 3, giữ chỗ */
  vi_do: number | null;
  kinh_do: number | null;
  ban_kinh_m: number;
  nguoi_tao: string | null;
  created_at: string;
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
}

export interface TtcTienDo {
  id: string;
  dau_viec_id: string;
  nguoi: string;
  hoan_thanh: boolean;
  thoi_diem: string | null;
  ghi_chu: string | null;
  file_url: string | null;
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

/**
 * Ba việc gối đầu — «3 việc lựa chọn với cán bộ». Thẻ việc THẬT nằm ở Chiêu
 * thức 2 (`dau_viec_id` trỏ sang ct2_dau_viec) để cán bộ được giao ghi nhịp
 * bằng đúng công cụ Phòng đang dùng; ở đây chỉ giữ phần thuộc về chương trình:
 * WHY, tiêu chuẩn, mốc kiểm tra, nghiệm thu của Ban Giám đốc.
 */
export interface TtcViecGoiDau {
  id: string;
  chuong_trinh_id: string;
  hoc_vien: string;
  so: 1 | 2 | 3;
  ten: string;
  muc_dich: string | null;
  dau_ra: string | null;
  can_bo: string | null;
  tieu_chuan: string | null;
  han: string | null;
  moc_kiem_tra: string | null;
  dau_viec_id: string | null;
  ket_qua: string | null;
  nghiem_thu: string | null;
  nguoi_nghiem_thu: string | null;
  nghiem_thu_luc: string | null;
  updated_at: string;
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

/** Số thứ tự việc gối đầu (1–3) theo mã thẻ Chiêu thức 2 — để gắn huy hiệu lên thẻ */
export function huyHieuGoiDau(dsGoiDau: Array<Pick<TtcViecGoiDau, 'so' | 'dau_viec_id'>>): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of dsGoiDau) if (g.dau_viec_id) m.set(g.dau_viec_id, g.so);
  return m;
}

/** Sáu trường 5W2H của một việc gối đầu đã đủ chưa — ô nghiệm thu chỉ mở khi đủ */
export function goiDauDuTruong(g: Pick<TtcViecGoiDau, 'ten' | 'muc_dich' | 'dau_ra' | 'can_bo' | 'tieu_chuan' | 'han' | 'moc_kiem_tra'>): boolean {
  return [g.ten, g.muc_dich, g.dau_ra, g.can_bo, g.tieu_chuan, g.han, g.moc_kiem_tra]
    .every((x) => typeof x === 'string' && x.trim().length > 0);
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
} as const;

/** Tin của Training Center mở về đâu — cùng luật với duongDanThongBao (ct2.ts) và notify-ct2 */
export function laTinTrainingCenter(maSuKien: string): boolean {
  return maSuKien.startsWith('TTC_');
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
