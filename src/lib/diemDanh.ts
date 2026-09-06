/**
 * ĐIỂM DANH của Bắc Hưng Yên Training Center — hai luồng.
 *
 * Phần logic thuần: đọc cấu hình, tính khoảng cách để BÁO TRƯỚC cho học viên,
 * đặt tên tệp QR, chọn châm ngôn của ngày, gom số liệu cho bảng theo dõi.
 *
 * Lưu ý về ranh giới: khoảng cách tính ở đây CHỈ để hiện chữ «đang cách phòng
 * học khoảng 40 m» trước khi bấm. Quyết định cho hay không cho điểm danh nằm ở
 * hàm `ttc_ghi_diem_danh` của máy chủ — toạ độ do trình duyệt gửi lên, ai cũng
 * sửa được, nên trình duyệt không bao giờ là nơi kết luận.
 * Xem thêm: `supabase/migrations/20261011090000_ttc_diem_danh.sql`.
 */
import { ngayVnChuoi } from './lichNghi';
import { boDau } from './vietnamese';

export type TtcLuongDiemDanh = 'DINH_VI' | 'QR' | 'BO_SUNG';

export const TTC_TEN_LUONG: Record<TtcLuongDiemDanh, string> = {
  DINH_VI: 'Định vị',
  QR: 'Quét QR',
  BO_SUNG: 'Ghi hộ',
};

/** Hai luồng học viên tự làm được — «Ghi hộ» là việc của Phòng Tổng hợp, không bật/tắt */
export const TTC_LUONG_CHON: Array<{ ma: 'DINH_VI' | 'QR'; ten: string; mo: string }> = [
  {
    ma: 'DINH_VI',
    ten: 'Điện thoại và định vị',
    mo: 'Học viên mở cổng trên điện thoại, bấm «Điểm danh», cho phép định vị. Máy chủ đo khoảng cách tới phòng học.',
  },
  {
    ma: 'QR',
    ten: 'Quét mã QR của ngày',
    mo: 'Phòng Tổng hợp in mỗi ngày một tấm QR riêng, Phó Giám đốc mở ra trong phòng học để học viên quét.',
  },
];

export interface TtcCauHinhDiemDanh {
  bat: boolean;
  /** Sau giờ bắt đầu bao nhiêu phút thì tính là muộn */
  muon_phut: number;
  luong: Array<'DINH_VI' | 'QR'>;
}

/**
 * Lớp mới mặc định CHỈ MỞ QR.
 *
 * Giám đốc 06/09: «một số lớp sẽ chỉ mở QR; sau khi test định vị chính xác mới
 * mở phần định vị diện rộng». Mặc định mở sẵn cả hai luồng thì lớp nào quên rà
 * lại là chạy thật bằng một toạ độ chưa ai đo — hỏng đúng vào sáng ngày học.
 */
export const TTC_DIEM_DANH_MAC_DINH = (): TtcCauHinhDiemDanh => ({
  bat: false,
  muon_phut: 15,
  luong: ['QR'],
});

/** Bán kính mặc định quanh phòng học (mét) khi chương trình chưa đặt */
export const TTC_BAN_KINH_MAC_DINH = 150;

export function docCauHinhDiemDanh(json: unknown): TtcCauHinhDiemDanh {
  const mac = TTC_DIEM_DANH_MAC_DINH();
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const phut = Number(o.muon_phut);
  const luong = Array.isArray(o.luong)
    ? (o.luong.filter((x): x is 'DINH_VI' | 'QR' => x === 'DINH_VI' || x === 'QR'))
    : mac.luong;
  return {
    bat: o.bat === true,
    muon_phut: Number.isFinite(phut) && phut >= 0 && phut <= 120 ? Math.round(phut) : mac.muon_phut,
    luong: [...new Set(luong)],
  };
}

export interface TtcDiemDanh {
  id: string;
  ngay_id: string;
  nguoi: string;
  luc: string;
  luong: TtcLuongDiemDanh;
  vi_do: number | null;
  kinh_do: number | null;
  do_chinh_xac_m: number | null;
  khoang_cach_m: number | null;
  muon_phut: number;
  qr_ngay_id: string | null;
  nguoi_ghi_ho: string | null;
  ghi_chu: string | null;
}

export interface TtcQrNgay {
  id: string;
  ngay_id: string;
  ma: string;
  vo_hieu: boolean;
  nguoi_tao: string | null;
  tao_luc: string;
}

/** Kết quả máy chủ trả về sau một lần bấm điểm danh */
export interface KetQuaDiemDanh {
  ok: boolean;
  thong_bao: string;
  muon_phut?: number;
  khoang_cach_m?: number;
  da_co?: boolean;
}

// ---------------------------------------------------------------------------
// Khoảng cách
// ---------------------------------------------------------------------------

const BAN_KINH_TRAI_DAT_M = 6_371_000;

/** Khoảng cách hai toạ độ theo mét (Haversine) — cùng công thức với ttc_khoang_cach_m */
export function khoangCachM(viDo1: number, kinhDo1: number, viDo2: number, kinhDo2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(viDo2 - viDo1) / 2) ** 2
    + Math.cos(rad(viDo1)) * Math.cos(rad(viDo2)) * Math.sin(rad(kinhDo2 - kinhDo1) / 2) ** 2;
  return 2 * BAN_KINH_TRAI_DAT_M * Math.asin(Math.sqrt(a));
}

/** Chữ cho khoảng cách: dưới 1 km đọc theo mét, trên 1 km đọc theo ki-lô-mét */
export function chuKhoangCach(met: number | null | undefined): string {
  if (met == null || !Number.isFinite(met)) return '—';
  if (met < 1000) return `${Math.round(met)} m`;
  return `${(met / 1000).toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Nhãn trạng thái
// ---------------------------------------------------------------------------

export interface NhanDiemDanh {
  chu: string;
  muc: 'XONG' | 'MUON' | 'CHUA';
}

/** Giờ HH:MM theo giờ Việt Nam của một mốc ISO */
export function gioVn(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function nhanDiemDanh(dd: TtcDiemDanh | null | undefined): NhanDiemDanh {
  if (!dd) return { chu: 'Chưa điểm danh', muc: 'CHUA' };
  const gio = gioVn(dd.luc);
  const cach = dd.luong === 'BO_SUNG' ? 'ghi hộ' : TTC_TEN_LUONG[dd.luong].toLowerCase();
  if (dd.muon_phut > 0) return { chu: `Đã điểm danh ${gio} · muộn ${dd.muon_phut} phút · ${cach}`, muc: 'MUON' };
  return { chu: `Đã điểm danh ${gio} · đúng giờ · ${cach}`, muc: 'XONG' };
}

export interface TomTatDiemDanh {
  tong: number;
  coMat: number;
  muon: number;
  vang: number;
}

export function tomTatDiemDanh(soHocVien: number, ds: TtcDiemDanh[]): TomTatDiemDanh {
  const coMat = ds.length;
  return {
    tong: soHocVien,
    coMat,
    muon: ds.filter((d) => d.muon_phut > 0).length,
    vang: Math.max(0, soHocVien - coMat),
  };
}

// ---------------------------------------------------------------------------
// Tấm QR in ra
// ---------------------------------------------------------------------------

/**
 * Châm ngôn EQ in dưới mã QR — mỗi ngày một câu, quay vòng theo số thứ tự ngày.
 *
 * Vì sao câu KHÔNG gán tên tác giả: bộ câu này do Chi nhánh soạn cho chương
 * trình. Gán một cái tên nổi tiếng vào một câu đã dịch lại là cách nhanh nhất
 * để in ra một trích dẫn sai rồi treo trong phòng học suốt mười ngày.
 */
export const CHAM_NGON_EQ: string[] = [
  'Nghe hết câu trước khi nghĩ câu trả lời.',
  'Người bình tĩnh nhất trong phòng là người dẫn được cuộc họp.',
  'Hỏi thêm một câu trước khi kết luận về một người.',
  'Cảm xúc là dữ liệu, không phải mệnh lệnh.',
  'Khen việc cụ thể trước tập thể, góp ý riêng từng người.',
  'Chậm lại sáu giây trước khi trả lời một tin nhắn làm mình khó chịu.',
  'Việc khó nói ra hôm nay rẻ hơn việc khó nói ra tháng sau.',
  'Cán bộ nhớ cách mình đối xử lâu hơn nhớ điều mình nói.',
  'Gọi đúng tên cảm xúc là đã xử lý được một nửa.',
  'Niềm tin xây bằng những lần giữ lời rất nhỏ.',
];

export function chamNgonCuaNgay(soThuTu: number): string {
  const i = ((Math.round(soThuTu) - 1) % CHAM_NGON_EQ.length + CHAM_NGON_EQ.length) % CHAM_NGON_EQ.length;
  return CHAM_NGON_EQ[i];
}

/**
 * Đường dẫn nằm trong mã QR. Lấy `origin` từ chính trình duyệt đang mở màn in
 * chứ không viết cứng tên miền: cổng đã đổi tên miền một lần (08/2026), viết
 * cứng thì tấm QR in ra hôm nay hỏng vào ngày đổi tên miền sau.
 */
export function duongDanQuet(origin: string, ma: string): string {
  return `${origin.replace(/\/$/, '')}/one/training-center/diem-danh?ma=${encodeURIComponent(ma)}`;
}

/** Tên tệp ảnh QR tải về: QR_NGAY02_08-09-2026_ChuongTrinh10Ngay.png */
export function tenFileQr(soThuTu: number, ngayIso: string, tenChuongTrinh: string): string {
  const ngay = ngayIso.split('-').reverse().join('-');
  const ten = boDau(tenChuongTrinh).replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ').filter(Boolean).map((t) => t[0].toUpperCase() + t.slice(1)).join('').slice(0, 28);
  return `QR_NGAY${String(soThuTu).padStart(2, '0')}_${ngay}${ten ? `_${ten}` : ''}.png`;
}

/** Bốn ký tự cuối của mã — in nhỏ ở chân tấm QR để đối chiếu tấm nào là tấm mới nhất */
export function duoiMa(ma: string): string {
  return ma.slice(-4).toUpperCase();
}

/** Hôm nay có phải ngày học không — dùng để chỉ hiện thẻ điểm danh đúng ngày */
export function laNgayHocHomNay(ngayIso: string, homNay: string = ngayVnChuoi(new Date())): boolean {
  return ngayIso === homNay;
}

// ---------------------------------------------------------------------------
// Thẩm định định vị — đo thử tại phòng học trước khi mở luồng định vị
// ---------------------------------------------------------------------------

/** Số lần thử tối thiểu — trùng với ttc_so_lan_thu_toi_thieu() ở máy chủ */
export const SO_LAN_THU_TOI_THIEU = 3;

export interface TtcThuDinhVi {
  id: string;
  chuong_trinh_id: string;
  nguoi: string;
  luc: string;
  vi_do: number;
  kinh_do: number;
  do_chinh_xac_m: number | null;
  khoang_cach_m: number;
  vi_tri: string | null;
}

export interface KetLuanThuDinhVi {
  soLan: number;
  /** Ba lần gần nhất — đúng tập máy chủ xét khi cho phép bật luồng định vị */
  baGanNhat: TtcThuDinhVi[];
  /** Đủ điều kiện bật luồng định vị chưa */
  datChuan: boolean;
  xaNhat: number | null;
  saiSoLonNhat: number | null;
  /** Bán kính nên đặt: chỗ xa nhất cộng sai số máy báo, làm tròn lên bội 50 */
  banKinhDeXuat: number | null;
  cau: string;
}

/** Bán kính của cột ttc_chuong_trinh.ban_kinh_m — CHECK (50..2000) */
export const TTC_BAN_KINH_MIN = 50;
export const TTC_BAN_KINH_MAX = 2000;

/**
 * Kết luận đợt thử. Máy chủ chỉ xét BA LẦN GẦN NHẤT (xem ttc_dinh_vi_da_tham_dinh)
 * chứ không xét toàn bộ lịch sử: đổi phòng học hoặc đổi toạ độ thì các lần đo cũ
 * nói về một chỗ khác, giữ lại để đối chiếu chứ không dùng để kết luận.
 */
export function ketLuanThuDinhVi(ds: TtcThuDinhVi[], banKinh: number): KetLuanThuDinhVi {
  const theoGio = [...ds].sort((a, b) => b.luc.localeCompare(a.luc));
  const baGanNhat = theoGio.slice(0, SO_LAN_THU_TOI_THIEU);
  const datChuan = baGanNhat.length === SO_LAN_THU_TOI_THIEU
    && baGanNhat.every((t) => t.khoang_cach_m <= banKinh);
  const xaNhat = ds.length ? Math.max(...ds.map((t) => t.khoang_cach_m)) : null;
  const saiSoLonNhat = ds.length ? Math.max(...ds.map((t) => t.do_chinh_xac_m ?? 0)) : null;
  const canPhu = ds.length ? Math.max(...ds.map((t) => t.khoang_cach_m + (t.do_chinh_xac_m ?? 0))) : null;
  const banKinhDeXuat = canPhu === null
    ? null
    : Math.min(TTC_BAN_KINH_MAX, Math.max(TTC_BAN_KINH_MIN, Math.ceil(canPhu / 50) * 50));

  const conThieu = SO_LAN_THU_TOI_THIEU - baGanNhat.length;
  const cau = ds.length === 0
    ? `Chưa thử lần nào. Đứng tại phòng học bấm «Thử tại chỗ này» ${SO_LAN_THU_TOI_THIEU} lần ở ${SO_LAN_THU_TOI_THIEU} chỗ ngồi khác nhau.`
    : datChuan
      ? `Đã đạt: ${SO_LAN_THU_TOI_THIEU} lần gần nhất đều trong bán kính ${banKinh} m. Mở được luồng định vị.`
      : conThieu > 0
        ? `Còn thiếu ${conThieu} lần thử nữa.`
        : `Có lần đo vượt bán kính ${banKinh} m. Đo lại toạ độ phòng học, hoặc nới bán kính rồi thử lại ${SO_LAN_THU_TOI_THIEU} lần.`;

  return { soLan: ds.length, baGanNhat, datChuan, xaNhat, saiSoLonNhat, banKinhDeXuat, cau };
}

/** Nhãn ngắn cho danh sách chương trình: lần đào tạo này đang mở luồng nào */
export function nhanLuong(cauHinh: TtcCauHinhDiemDanh): string {
  if (!cauHinh.bat) return 'Chưa bật điểm danh';
  if (cauHinh.luong.length === 0) return 'Bật nhưng chưa chọn luồng';
  return cauHinh.luong.map((l) => (l === 'QR' ? 'QR' : 'Định vị')).join(' + ');
}
