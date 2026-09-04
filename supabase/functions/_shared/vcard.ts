/**
 * DỰNG vCard 3.0 cho danh thiếp số.
 *
 * File này KHÔNG import gì và có BẢN SAO Y HỆT ở
 * supabase/functions/_shared/vcard.ts (edge function `danh-thiep-vcard` trả
 * tệp .vcf cho khách). Sửa một bên thì chép nguyên sang bên kia — có kiểm thử
 * so hai tệp từng byte.
 *
 * Vì sao 3.0 chứ không 4.0, và vì sao không QUOTED-PRINTABLE: Android cũ và một
 * số app danh bạ Trung Quốc/Hàn Quốc đọc 3.0 UTF-8 ổn định nhất; QP làm hỏng dấu
 * tiếng Việt (Mục 7.2 đặc tả). Mọi dòng gấp ở 75 byte theo RFC 2426, không cắt
 * giữa một ký tự UTF-8.
 */

export interface DuLieuVcard {
  /** Họ tên tiếng Việt có dấu */
  hoTen: string;
  /** Họ tên không dấu — dùng cho tên tệp và trường N */
  hoTenLatin: string;
  /** Tên bản địa (Hán tự / Hangul / Katakana) khi khách dùng ngôn ngữ CJK */
  tenBanDia?: string;
  /** Chức danh đã chọn đúng ngôn ngữ */
  chucDanh?: string;
  /** Chuỗi đơn vị từ gốc: [Ngân hàng, Chi nhánh, Phòng/PGD] — đã chọn ngôn ngữ */
  donVi: string[];
  diaChi?: string;
  sdtDiDong?: string;
  sdtCoQuan?: string;
  email?: string;
  url?: string;
  anh?: string;
  ghiChu?: string;
}

/** Ký tự đặc biệt trong giá trị vCard: \ ; , và xuống dòng. */
function thoat(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Gấp dòng ở 75 byte, dòng nối bắt đầu bằng một khoảng trắng (RFC 2426 §2.6). */
export function gapDong(dong: string): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(dong);
  if (bytes.length <= 75) return dong;
  const ket: string[] = [];
  let dau = 0;
  let gioiHan = 75;
  while (dau < bytes.length) {
    let cuoi = Math.min(dau + gioiHan, bytes.length);
    // Không cắt giữa một ký tự nhiều byte: lùi tới đầu ký tự (byte không phải 10xxxxxx)
    while (cuoi < bytes.length && cuoi > dau && (bytes[cuoi] & 0xc0) === 0x80) cuoi--;
    ket.push(new TextDecoder().decode(bytes.slice(dau, cuoi)));
    dau = cuoi;
    gioiHan = 74; // dòng nối có thêm khoảng trắng đầu dòng
  }
  return ket.join('\r\n ');
}

/**
 * Số điện thoại Việt Nam về dạng quốc tế E.164 để khách nước ngoài gọi được:
 * 0966 503 279 → +84966503279. Số đã có + thì giữ; số lạ giữ nguyên chữ số.
 */
export function chuanHoaSdt(raw: string | null | undefined): string {
  const s = (raw ?? '').replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('+')) return s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  if (s.startsWith('84') && s.length >= 11) return '+' + s;
  if (s.startsWith('0') && s.length === 10) return '+84' + s.slice(1);
  return s;
}

/** Tách họ / tên đệm+tên theo thói quen Việt Nam: từ đầu là họ. */
function tachHoTen(hoTen: string): { ho: string; ten: string } {
  const tu = hoTen.trim().split(/\s+/);
  if (tu.length <= 1) return { ho: '', ten: hoTen.trim() };
  return { ho: tu[0], ten: tu.slice(1).join(' ') };
}

export function taoVcard(d: DuLieuVcard): string {
  const { ho, ten } = tachHoTen(d.hoTen);
  // Với khách CJK: FN = «名 - Ten tieng Viet» để tra được cả hai cách (Mục 7.2)
  const fn = d.tenBanDia ? `${d.tenBanDia} - ${d.hoTenLatin}` : d.hoTen;
  const dong: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${thoat(ho)};${thoat(ten)};;;`,
    `FN:${thoat(fn)}`,
  ];
  if (d.donVi.length) dong.push(`ORG:${d.donVi.map(thoat).join(';')}`);
  if (d.chucDanh) dong.push(`TITLE:${thoat(d.chucDanh)}`);
  const diDong = chuanHoaSdt(d.sdtDiDong);
  if (diDong) dong.push(`TEL;TYPE=CELL,VOICE:${diDong}`);
  const coQuan = chuanHoaSdt(d.sdtCoQuan);
  if (coQuan) dong.push(`TEL;TYPE=WORK,VOICE:${coQuan}`);
  if (d.email) dong.push(`EMAIL;TYPE=INTERNET,WORK:${thoat(d.email)}`);
  if (d.diaChi) dong.push(`ADR;TYPE=WORK:;;${thoat(d.diaChi)};;;;`);
  if (d.url) dong.push(`URL:${thoat(d.url)}`);
  if (d.anh) dong.push(`PHOTO;VALUE=URI:${thoat(d.anh)}`);
  if (d.ghiChu) dong.push(`NOTE:${thoat(d.ghiChu)}`);
  dong.push(`REV:${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`);
  dong.push('END:VCARD');
  return dong.map(gapDong).join('\r\n') + '\r\n';
}

/** Tên tệp ASCII an toàn: TranVanKhai-VietinBank-BHY-ko.vcf */
export function tenTepVcard(hoTenLatin: string, lang: string): string {
  const ten = (hoTenLatin || 'LienHe').replace(/[^A-Za-z0-9]+/g, '') || 'LienHe';
  const l = /^[a-z_]{2,7}$/.test(lang) ? lang : 'vi';
  return `${ten}-VietinBank-BHY-${l}.vcf`;
}
