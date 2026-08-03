/**
 * Đổi ngày âm lịch ↔ dương lịch theo lịch Việt Nam.
 *
 * Vì sao cần: hai trong số các kỳ nghỉ của Chi nhánh neo vào âm lịch — Tết
 * Nguyên đán (mùng 1 tháng Giêng) và Giỗ Tổ Hùng Vương (mùng 10 tháng 3. Không
 * tính được hai mốc này thì không thể nhắc quản trị trước 10 ngày.
 *
 * Thuật toán của Hồ Ngọc Đức (tính thiên văn: điểm sóc và kinh độ mặt trời),
 * chạy ở MÚI GIỜ +7. Múi giờ là phần quan trọng: lịch âm Việt Nam và lịch âm
 * Trung Quốc (+8) lệch nhau vài ngày ở một số năm, vì điểm sóc rơi sát nửa đêm.
 * Dùng nhầm +8 là Tết lệch một ngày — với ngân hàng thì đó là lệch cả lịch trực.
 *
 * Hàm thuần, không phụ thuộc React hay mạng.
 */

const MUI_GIO_VN = 7;
const PI = Math.PI;

const nguyen = (d: number) => Math.floor(d);

/** Ngày dương → số ngày Julius */
export function sangJulius(ngay: number, thang: number, nam: number): number {
  const a = nguyen((14 - thang) / 12);
  const y = nam + 4800 - a;
  const m = thang + 12 * a - 3;
  let jd = ngay + nguyen((153 * m + 2) / 5) + 365 * y
    + nguyen(y / 4) - nguyen(y / 100) + nguyen(y / 400) - 32045;
  if (jd < 2299161) {
    jd = ngay + nguyen((153 * m + 2) / 5) + 365 * y + nguyen(y / 4) - 32083;
  }
  return jd;
}

/** Số ngày Julius → [ngày, tháng, năm] dương lịch */
export function tuJulius(jd: number): [number, number, number] {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = nguyen((4 * a + 3) / 146097);
    c = a - nguyen((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = nguyen((4 * c + 3) / 1461);
  const e = c - nguyen((1461 * d) / 4);
  const m = nguyen((5 * e + 2) / 153);
  const ngay = e - nguyen((153 * m + 2) / 5) + 1;
  const thang = m + 3 - 12 * nguyen(m / 10);
  const nam = b * 100 + d - 4800 + nguyen(m / 10);
  return [ngay, thang, nam];
}

/** Thời điểm điểm sóc (trăng mới) thứ k tính từ 1/1/1900, theo ngày Julius */
function diemSoc(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 = c1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - deltat;
}

/** Kinh độ mặt trời (radian) tại một thời điểm Julius */
function kinhDoMatTroi(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  dl += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + dl) * dr;
  L -= PI * 2 * nguyen(L / (PI * 2));
  return L;
}

/** Cung hoàng đạo (0–11) của mặt trời vào một ngày, theo múi giờ đã cho */
function cungMatTroi(soNgay: number, muiGio: number): number {
  return nguyen(kinhDoMatTroi(soNgay - 0.5 - muiGio / 24) / PI * 6);
}

function ngayDiemSoc(k: number, muiGio: number): number {
  return nguyen(diemSoc(k) + 0.5 + muiGio / 24);
}

/** Ngày bắt đầu tháng 11 âm lịch của một năm dương */
function thangMuoiMot(nam: number, muiGio: number): number {
  const off = sangJulius(31, 12, nam) - 2415021;
  const k = nguyen(off / 29.530588853);
  let nm = ngayDiemSoc(k, muiGio);
  if (cungMatTroi(nm, muiGio) >= 9) {
    nm = ngayDiemSoc(k - 1, muiGio);
  }
  return nm;
}

/** Vị trí tháng nhuận trong năm âm lịch bắt đầu từ tháng 11 tại a11 */
function viTriThangNhuan(a11: number, muiGio: number): number {
  const k = nguyen((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let i = 1;
  let arc = cungMatTroi(ngayDiemSoc(k + i, muiGio), muiGio);
  let truoc: number;
  do {
    truoc = arc;
    i++;
    arc = cungMatTroi(ngayDiemSoc(k + i, muiGio), muiGio);
  } while (arc !== truoc && i < 14);
  return i - 1;
}

/**
 * Âm lịch → dương lịch. Trả `null` nếu tháng nhuận yêu cầu không tồn tại trong
 * năm đó (VD đòi «tháng 3 nhuận» của một năm không nhuận tháng 3).
 */
export function amSangDuong(
  ngayAm: number,
  thangAm: number,
  namAm: number,
  nhuan = false,
  muiGio = MUI_GIO_VN,
): [number, number, number] | null {
  let a11: number;
  let b11: number;
  if (thangAm < 11) {
    a11 = thangMuoiMot(namAm - 1, muiGio);
    b11 = thangMuoiMot(namAm, muiGio);
  } else {
    a11 = thangMuoiMot(namAm, muiGio);
    b11 = thangMuoiMot(namAm + 1, muiGio);
  }
  let off = thangAm - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const viTri = viTriThangNhuan(a11, muiGio);
    let thangNhuan = viTri - 2;
    if (thangNhuan < 0) thangNhuan += 12;
    if (nhuan && thangAm !== thangNhuan) return null;
    if (nhuan || off >= viTri) off += 1;
  } else if (nhuan) {
    return null;
  }
  const k = nguyen(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  const dauThang = ngayDiemSoc(k + off, muiGio);
  return tuJulius(dauThang + ngayAm - 1);
}

/** Dương lịch → âm lịch: [ngày, tháng, năm, nhuận?] */
export function duongSangAm(
  ngay: number,
  thang: number,
  nam: number,
  muiGio = MUI_GIO_VN,
): [number, number, number, boolean] {
  const dayNumber = sangJulius(ngay, thang, nam);
  const k = nguyen((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = ngayDiemSoc(k + 1, muiGio);
  if (monthStart > dayNumber) monthStart = ngayDiemSoc(k, muiGio);
  let a11 = thangMuoiMot(nam, muiGio);
  let b11 = a11;
  let namAm: number;
  if (a11 >= monthStart) {
    namAm = nam;
    a11 = thangMuoiMot(nam - 1, muiGio);
  } else {
    namAm = nam + 1;
    b11 = thangMuoiMot(nam + 1, muiGio);
  }
  const ngayAm = dayNumber - monthStart + 1;
  const diff = nguyen((monthStart - a11) / 29);
  let nhuan = false;
  let thangAm = diff + 11;
  if (b11 - a11 > 365) {
    const viTri = viTriThangNhuan(a11, muiGio);
    if (diff >= viTri) {
      thangAm = diff + 10;
      if (diff === viTri) nhuan = true;
    }
  }
  if (thangAm > 12) thangAm -= 12;
  if (thangAm >= 11 && diff < 4) namAm -= 1;
  return [ngayAm, thangAm, namAm, nhuan];
}

// ---------------------------------------------------------------------------
// Mốc lễ cố định của Việt Nam
// ---------------------------------------------------------------------------

/** Mã mốc lễ — dùng làm khóa chống nhắc trùng */
export type MaMocLe = 'TET_DUONG' | 'TET_AM' | 'GIO_TO' | 'GIAI_PHONG' | 'LAO_DONG' | 'QUOC_KHANH';

export interface MocLe {
  ma: MaMocLe;
  ten: string;
  /** Ngày dương lịch dạng YYYY-MM-DD */
  ngay: string;
  /** Vì sao Chi nhánh phải chờ Chính phủ chốt rồi mới nhập được */
  ghiChu: string;
}

const hai = (n: number) => String(n).padStart(2, '0');
const dinhDang = (ngay: number, thang: number, nam: number) => `${nam}-${hai(thang)}-${hai(ngay)}`;

/**
 * Sáu mốc lễ chính thức trong một năm dương.
 *
 * Bốn mốc neo cứng vào dương lịch, hai mốc phải tính từ âm lịch. Với mỗi mốc,
 * Chính phủ mới là nơi chốt lịch nghỉ CỤ THỂ (nghỉ mấy ngày, hoán đổi ngày nào)
 * — thường công bố trước vài tuần. Vì vậy hệ thống không tự điền lịch nghỉ, chỉ
 * NHẮC quản trị trước 10 ngày để vào nhập cho đúng.
 */
export function mocLeTrongNam(nam: number): MocLe[] {
  const ds: MocLe[] = [
    {
      ma: 'TET_DUONG',
      ten: 'Tết Dương lịch',
      ngay: dinhDang(1, 1, nam),
      ghiChu: 'Nghỉ 01 ngày; rơi vào cuối tuần thì được nghỉ bù.',
    },
    {
      ma: 'GIAI_PHONG',
      ten: 'Ngày Giải phóng miền Nam, thống nhất đất nước',
      ngay: dinhDang(30, 4, nam),
      ghiChu: 'Thường nghỉ liền với 01/5 thành một kỳ; Chính phủ chốt phương án hoán đổi.',
    },
    {
      ma: 'LAO_DONG',
      ten: 'Ngày Quốc tế Lao động',
      ngay: dinhDang(1, 5, nam),
      ghiChu: 'Thường nghỉ liền với 30/4 thành một kỳ.',
    },
    {
      ma: 'QUOC_KHANH',
      ten: 'Quốc khánh',
      ngay: dinhDang(2, 9, nam),
      ghiChu: 'Nghỉ 02 ngày, Chính phủ chốt là ngày liền trước hay liền sau 02/9.',
    },
  ];

  // Tết Nguyên đán: mùng 1 tháng Giêng âm lịch của năm âm trùng tên năm dương
  const tet = amSangDuong(1, 1, nam);
  if (tet) {
    ds.push({
      ma: 'TET_AM',
      ten: 'Tết Nguyên đán (mùng 1 tháng Giêng)',
      ngay: dinhDang(tet[0], tet[1], tet[2]),
      ghiChu: 'Kỳ nghỉ dài nhất năm, thường 5–9 ngày kèm hoán đổi ngày làm bù. Phải chờ Chính phủ chốt.',
    });
  }

  // Giỗ Tổ Hùng Vương: mùng 10 tháng 3 âm lịch
  const gioTo = amSangDuong(10, 3, nam);
  if (gioTo) {
    ds.push({
      ma: 'GIO_TO',
      ten: 'Giỗ Tổ Hùng Vương (mùng 10 tháng 3)',
      ngay: dinhDang(gioTo[0], gioTo[1], gioTo[2]),
      ghiChu: 'Nghỉ 01 ngày; rơi vào cuối tuần thì được nghỉ bù.',
    });
  }

  return ds.sort((a, b) => a.ngay.localeCompare(b.ngay));
}

/**
 * Mốc lễ rơi trong khoảng từ hôm nay đến `soNgay` ngày tới.
 *
 * CỐ Ý quét cả một KHOẢNG chứ không phải đúng ngày thứ 10. Tác vụ nhắc chỉ chạy
 * ngày thường; nếu bắt khớp đúng ngày thì mốc nào rơi vào «đúng 10 ngày trước»
 * là thứ Bảy sẽ không bao giờ được nhắc. Quét khoảng cộng với bảng chống nhắc
 * trùng cho kết quả đúng dù tác vụ chạy trễ vài ngày.
 *
 * Quét cả năm nay lẫn năm sau, vì tháng 12 nhìn tới đã thấy Tết Dương lịch và
 * có năm thấy cả Tết Nguyên đán của năm sau.
 */
export function mocLeTrongVong(moc: Date, soNgay: number): MocLe[] {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const homNay = dinhDang(vn.getDate(), vn.getMonth() + 1, vn.getFullYear());
  const dich = new Date(vn.getFullYear(), vn.getMonth(), vn.getDate() + soNgay);
  const hetHan = dinhDang(dich.getDate(), dich.getMonth() + 1, dich.getFullYear());
  return [...mocLeTrongNam(vn.getFullYear()), ...mocLeTrongNam(vn.getFullYear() + 1)]
    .filter((m) => m.ngay >= homNay && m.ngay <= hetHan)
    .sort((a, b) => a.ngay.localeCompare(b.ngay));
}

/** Số ngày còn lại tới một mốc lễ, tính theo lịch VN */
export function conBaoNhieuNgay(mocLe: MocLe, moc: Date): number {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [y, m, d] = mocLe.ngay.split('-').map(Number);
  const a = Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate());
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86_400_000);
}
