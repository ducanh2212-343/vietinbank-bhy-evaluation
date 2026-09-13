/**
 * MÃ LƯU NHANH — mã QR chứa THẲNG danh bạ (vCard), không chứa đường dẫn.
 *
 * Dùng cho khách Việt Nam có tuổi ở hội trường đền bù giải phóng mặt bằng:
 * camera gốc của iPhone (iOS 11+) và Android đọc mã này rồi hiện ngay «Thêm
 * liên hệ», không cần mạng, không cần cài gì. Mã đường dẫn của thẻ đa ngôn ngữ
 * cần mạng và thêm hai bước, không hợp nhóm khách này.
 *
 * Vì sao nội dung tối giản (chỉ tên + số): đo trên thư viện qrcode, vCard chỉ
 * tên có dấu + số là mã 49×49 ô; thêm đơn vị, chức danh, đường dẫn là 65×65 ô.
 * Tay khách có tuổi cầm máy rung, mã càng dày càng quét chậm.
 *
 * Vì sao cán bộ tự chọn tên có dấu hay không dấu: cán bộ báo cáo máy rẻ tiền
 * của khách ở các xã lưu tiếng Việt bị lỗi. Không quyết thay họ được vì tuỳ
 * đời máy; để cán bộ chọn theo thực tế địa bàn.
 */

/**
 * Tiền tố GỢI Ý trước tên, để khách gõ «Viet» trong danh bạ là ra. Chỉ là gợi
 * ý ban đầu — cán bộ gõ lại toàn bộ tên tuỳ ý (quyết định 13/09/2026: không
 * ép cứng, vì có cán bộ muốn «VietinBank BHY - Tên», «NH Công Thương - Tên»…).
 */
export const TIEN_TO = 'VietinBank - ';

/** Dạng số điện thoại trong mã. */
export type DangSo = 'noi_dia' | 'quoc_te';

export interface NoiDungMaNhanh {
  /** Tên hiện trong danh bạ khách, đúng như cán bộ gõ, ví dụ «VietinBank - Trần Văn Khái». */
  ten: string;
  /** Số điện thoại đúng như sẽ lưu vào máy khách. */
  sdt: string;
}

/** Bỏ dấu nhưng GIỮ chữ hoa/thường: «Trần Văn Khái» → «Tran Van Khai». */
export function boDauGiuHoa(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gợi ý tên ban đầu: tiền tố + họ tên trong hồ sơ. */
export function tenMacDinh(hoTen: string, khongDau: boolean): string {
  const t = (hoTen ?? '').replace(/\s+/g, ' ').trim();
  return TIEN_TO + (khongDau ? boDauGiuHoa(t) : t);
}

/** Chỉ giữ chữ số và dấu + đầu. */
function chiSo(raw: string): string {
  const s = (raw ?? '').replace(/[^\d+]/g, '');
  return s.startsWith('+') ? '+' + s.slice(1).replace(/\+/g, '') : s.replace(/\+/g, '');
}

/**
 * Chuẩn hoá số theo dạng chọn. Nội địa «0966503279» là dạng khách có tuổi quen
 * mắt và bấm gọi được trên mọi máy trong nước; quốc tế «+84966503279» cho thẻ
 * dùng chung với khách nước ngoài.
 */
export function chuanHoaSoTheoDang(raw: string, dang: DangSo): string {
  let s = chiSo(raw);
  if (!s) return '';
  // Về dạng quốc tế trước rồi mới đổi
  if (s.startsWith('00')) s = '+' + s.slice(2);
  else if (s.startsWith('0') && s.length === 10) s = '+84' + s.slice(1);
  else if (s.startsWith('84') && s.length >= 11) s = '+' + s;
  if (dang === 'quoc_te') return s;
  return s.startsWith('+84') ? '0' + s.slice(3) : s;
}

/** Số có hợp lệ để đưa vào mã không: 9–15 chữ số. */
export function soHopLe(raw: string): boolean {
  const s = chiSo(raw).replace(/^\+/, '');
  return /^\d{9,15}$/.test(s);
}

/** Ký tự đặc biệt trong giá trị vCard. */
function thoat(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, ' ');
}

/**
 * vCard 3.0 tối giản. Trường N để họ trống và đặt CẢ chuỗi vào phần tên: nếu
 * tách họ/tên thì một số máy Android hiện «Khái VietinBank - Trần Văn», mất
 * thứ tự chữ mà khách cần nhìn. Xuống dòng CRLF theo RFC 2426.
 */
export function taoVcardNhanh(nd: NoiDungMaNhanh): string {
  const ten = nd.ten.replace(/\s+/g, ' ').trim();
  const dong = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${thoat(ten)};;;`,
    `FN:${thoat(ten)}`,
    `TEL;TYPE=CELL:${chiSo(nd.sdt)}`,
    'END:VCARD',
  ];
  return dong.join('\r\n') + '\r\n';
}

/** Tên tệp PNG an toàn để in: VietinBank-TranVanKhai-luu-nhanh.png */
export function tenTepMaNhanh(ten: string): string {
  const t = boDauGiuHoa(ten).replace(/[^A-Za-z0-9]+/g, '') || 'VietinBank';
  return `${t}-luu-nhanh.png`;
}
