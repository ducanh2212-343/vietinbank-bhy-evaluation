// Mẫu tin Sao Xứng Đáng gửi vào nhóm Zalo — HÀM THUẦN, không phụ thuộc Deno hay
// Supabase, để kiểm thử được từ vitest và dùng lại ở trang Quản trị Zalo (xem trước
// ngay khi gõ). Import từ src: '../../../supabase/functions/_shared/zaloSaoMau'.
//
// Giám đốc chốt 12/09/2026: lý do nguyên văn (không che), kèm sao tích lũy và
// mốc quà kế tiếp, mỗi người nhận một tin riêng, chân tin là đường dẫn về cổng.
// 13/09: mẫu SỬA ĐƯỢC trên trang (zalo_cau_hinh.mau_tin_ca_nhan / mau_tin_tap_the),
// mỗi đề mục có biểu tượng riêng để nhìn là phân biệt được Người tặng / Vì đã / Kết quả.

import { O_MAU_REGEX, doiKieu, type KieuChu } from './zaloDinhDang.ts';

export interface PhieuSao {
  id: string;
  name: string;
  department: string | null;
  sub_unit: string | null;
  stars: number;
  reason: string | null;
  result: string | null;
  /** yyyy-mm-dd */
  awarded_on: string;
  sender: string | null;
  is_collective: boolean;
  recipient_profile_id: string | null;
}

export interface BoiCanhTin {
  /** Tổng sao tích lũy của người/tập thể trên phiếu (đã tính cả phiếu này) */
  tichLuy: number | null;
  /** Câu nhắc mốc quà kế tiếp từ sao_moc_qua_ke_tiep — null khi đã chạm mốc cao nhất */
  mocQua: string | null;
  linkChanTin: string;
  toiDaDong: number;
  lyDoToiDaKyTu: number;
}

export type CheDoGop = 'moi_nguoi_mot_tin' | 'gop_theo_nguoi_tang';

/** Mẫu tin: mỗi dòng một đề mục; dòng nào có ô trống thì tự bỏ. */
export interface MauTin {
  ca_nhan: string;
  tap_the: string;
}

/**
 * Mẫu mặc định (13/09/2026). Tham khảo tin cán bộ tự đăng tay trên nhóm nhưng
 * KHÔNG chép nguyên: cách một dòng trống giữa các mục để lướt nhanh trên điện
 * thoại; lý do dài nên xuống dòng riêng.
 *
 * VÌ SAO KHÔNG DÙNG CHỮ ĐẬM UNICODE Ở ĐÂY (đã thử rồi gỡ ra trong cùng ngày):
 * bản đậm Unicode (U+1D400…) không phải là «nét đậm của phông đang dùng» mà là
 * một BỘ CHỮ SERIF RIÊNG. Zalo vẽ nó bằng phông serif, phần còn lại bằng phông
 * sans của ứng dụng — ảnh chụp thật cho thấy một tin lẫn hai kiểu chữ, rối mắt
 * hơn là nổi bật. Giám đốc yêu cầu đồng bộ phông, nên làm nổi bật bằng VIẾT HOA:
 * cùng một phông, tiếng Việt đủ dấu, không chữ nào lệch nét.
 * Thanh công cụ vẫn giữ nút Đậm/Nghiêng cho ai cần, kèm cảnh báo đổi phông.
 *
 * Bộ biểu tượng, mỗi đầu mục một nghĩa, không trùng nhau:
 *   ⭐ tiêu đề chương trình        🎉 chúc mừng người/tập thể nhận
 *   🎁 người tặng (món quà từ ai)  💬 lý do — lời ghi nhận
 *   🏆 kết quả — thành quả          📈 tích lũy & mốc quà kế tiếp
 *   🤝 tập thể                      👉 đường dẫn
 * Chỉ dùng biểu tượng đơn sắc phổ thông — hiện giống nhau trên iOS/Android/Zalo PC.
 */
export const MAU_MAC_DINH: MauTin = {
  ca_nhan: [
    '⭐ SAO XỨNG ĐÁNG · {ngay}',
    '',
    '🎉 Chúc mừng {ten_noi_bat} vừa nhận {so_sao}!',
    '',
    '🎁 Người tặng: {nguoi_tang}',
    '',
    '💬 Ghi nhận vì:',
    '{ly_do}',
    '',
    '🏆 Kết quả: {ket_qua}',
    '',
    '📈 Tích lũy: {tich_luy} · {moc_qua}',
    '',
    '👉 {link}',
  ].join('\n'),
  tap_the: [
    '⭐ SAO TẬP THỂ · {ngay}',
    '',
    '🎉 Chúc mừng {ten_noi_bat} vừa nhận {so_sao}!',
    '',
    '🎁 Người tặng: {nguoi_tang}',
    '',
    '💬 Ghi nhận vì:',
    '{ly_do}',
    '',
    '🏆 Kết quả: {ket_qua}',
    '',
    '📈 Tập thể đã có {tich_luy} tích lũy',
    '',
    '🤝 Chúc mừng cả tập thể!',
    '',
    '👉 {link}',
  ].join('\n'),
};

/** Các ô có thể dùng trong mẫu — hiện trên trang quản trị để người sửa biết. */
export const CAC_O_MAU: { o: string; nghia: string }[] = [
  { o: '{ngay}', nghia: 'Ngày trao (dd/mm/yyyy)' },
  { o: '{ten}', nghia: 'Tên người / tập thể trên phiếu' },
  { o: '{phong}', nghia: 'Phòng / đơn vị' },
  { o: '{ten_phong}', nghia: 'Tên — Phòng (cá nhân); tên tập thể (tập thể)' },
  { o: '{ten_noi_bat}', nghia: 'Như trên nhưng TÊN VIẾT HOA — cách làm nổi bật giữ nguyên một phông' },
  { o: '{so_sao}', nghia: 'Số sao vừa nhận, ví dụ «2 Sao»' },
  { o: '{nguoi_tang}', nghia: 'Người tặng' },
  { o: '{ly_do}', nghia: 'Lý do (nguyên văn, cắt ở ngưỡng ký tự)' },
  { o: '{ket_qua}', nghia: 'Kết quả (bỏ nếu trống hoặc chỉ là số)' },
  { o: '{tich_luy}', nghia: 'Sao tích lũy, ví dụ «5 Sao» (tập thể: chỉ khi đã có sao trước đó)' },
  { o: '{moc_qua}', nghia: 'Câu nhắc mốc quà kế tiếp; đã chạm mốc cao nhất thì «Đã chạm mốc cao nhất 🏆»' },
  { o: '{link}', nghia: 'Đường dẫn chân tin (cài ở ô «Dòng cuối tin»)' },
  { o: '{ten:hoa}', nghia: 'Thêm «:hoa» sau tên ô để VIẾT HOA giá trị — cũng có :gach_chan, :dam (đậm đổi phông), :nghieng' },
];

/** Khóa gom: cùng khóa → cùng một tin. */
export function khoaGom(p: PhieuSao, cheDo: CheDoGop): string {
  if (cheDo === 'gop_theo_nguoi_tang') return 'nt|' + chuanHoa(p.sender ?? '');
  if (p.is_collective) return 'tt|' + chuanHoa(p.name);
  if (p.recipient_profile_id) return 'cb|' + p.recipient_profile_id;
  return 'cb|' + chuanHoa(p.name) + '|' + chuanHoa(p.department ?? '');
}

function chuanHoa(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function ngayVn(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function cat(s: string | null | undefined, max: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function soSao(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} Sao`;
}

/** Tên hiển thị: tập thể ghi nguyên tên phiếu («Tập thể PGD Ocean City»), cá nhân kèm phòng. */
function tenNguoi(p: PhieuSao): string {
  if (p.is_collective) return p.name.trim();
  const phong = (p.department ?? '').trim();
  return phong ? `${p.name.trim()} — ${phong}` : p.name.trim();
}

/**
 * Tên làm nổi bật: VIẾT HOA tên người, giữ nguyên tên phòng. Viết hoa cả cụm
 * «NGUYỄN THỊ LAN ANH — PHÒNG ÂN THI» thì cả dòng hét lên, mắt không còn bám
 * vào tên ai; chỉ hoa phần tên là vừa đủ. Tập thể thì viết hoa cả tên vì đó
 * chính là chủ thể được khen.
 */
function tenNoiBat(p: PhieuSao): string {
  const ten = p.name.trim().toLocaleUpperCase('vi-VN');
  if (p.is_collective) return ten;
  const phong = (p.department ?? '').trim();
  return phong ? `${ten} — ${phong}` : ten;
}

/** «Kết quả» ở phiếu cũ đôi khi chỉ là «1» — bỏ qua thứ không phải câu chữ hoặc trùng lý do. */
function ketQuaDangDung(p: PhieuSao, max: number): string {
  const kq = cat(p.result, max);
  const lyDo = cat(p.reason, max);
  return kq && kq.length > 3 && kq !== lyDo ? kq : '';
}

/** Giá trị các ô cho MỘT phiếu. Ô trống → dòng chứa nó bị bỏ. */
export function giaTriCacO(p: PhieuSao, bc: BoiCanhTin, tongSao = Number(p.stars)): Record<string, string> {
  const tichLuy = bc.tichLuy;
  return {
    ngay: ngayVn(p.awarded_on),
    ten: p.name.trim(),
    phong: (p.department ?? '').trim(),
    ten_phong: tenNguoi(p),
    ten_noi_bat: tenNoiBat(p),
    so_sao: soSao(tongSao),
    nguoi_tang: (p.sender ?? '').trim(),
    ly_do: cat(p.reason, bc.lyDoToiDaKyTu),
    ket_qua: ketQuaDangDung(p, bc.lyDoToiDaKyTu),
    // Cá nhân: luôn hiện tích lũy khi biết. Tập thể: chỉ khi đã có sao từ trước —
    // «Tập thể đã có 1 Sao tích lũy» ngay sau phiếu 1 Sao đầu tiên là thừa.
    tich_luy: tichLuy == null ? '' : (p.is_collective && tichLuy <= tongSao ? '' : soSao(tichLuy)),
    moc_qua: p.is_collective || tichLuy == null ? '' : (bc.mocQua ?? 'Đã chạm mốc cao nhất 🏆'),
    link: bc.linkChanTin.trim(),
  };
}

/**
 * Điền mẫu: thay {o} bằng giá trị. Mẫu chia thành KHỐI bởi dòng trống; một khối
 * có dòng nào chứa ô trống (hoặc ô không tồn tại) thì bỏ CẢ khối — nhờ vậy
 * «💬 Ghi nhận vì:» không đứng mồ côi khi phiếu không ghi lý do. Dòng trống
 * giữa các khối giữ nguyên, không bao giờ dồn thành hai dòng trống.
 */
export function dienMau(mau: string, o: Record<string, string>): string {
  const khoi: string[] = [];
  for (const khoiGoc of mau.replace(/\r/g, '').split(/\n[ \t]*\n/)) {
    const dongRa: string[] = [];
    let bo = false;
    for (const dongGoc of khoiGoc.split('\n')) {
      let thieu = false;
      // Ô có thể kèm kiểu chữ: {ten_phong:dam}. Kiểu áp cho GIÁ TRỊ lúc điền,
      // không áp cho tên ô — xem zaloDinhDang.apDungKieu.
      const dong = dongGoc.replace(O_MAU_REGEX, (_, k: string, kieu?: string) => {
        const v = o[k];
        if (!v) { thieu = true; return ''; }
        return kieu ? doiKieu(v, kieu as KieuChu) : v;
      });
      if (thieu) { bo = true; break; }
      if (dong.trim() !== '') dongRa.push(dong.trimEnd());
    }
    if (!bo && dongRa.length) khoi.push(dongRa.join('\n'));
  }
  return khoi.join('\n\n');
}

/**
 * Soạn MỘT tin cho một nhóm phiếu đã gom (cùng khóa). Phiếu đầu tiên quyết định
 * người/tập thể; các phiếu sau chỉ thêm dòng.
 */
export function soanTinSao(nhom: PhieuSao[], cheDo: CheDoGop, bc: BoiCanhTin, mau: MauTin = MAU_MAC_DINH): string {
  if (nhom.length === 0) return '';
  const p0 = nhom[0];
  const ngay = ngayVn(p0.awarded_on);
  const tongSao = nhom.reduce((s, p) => s + Number(p.stars || 0), 0);

  // Một phiếu — dùng mẫu quản trị sửa được
  if (nhom.length === 1) {
    const mauDung = (p0.is_collective ? mau.tap_the : mau.ca_nhan) || (p0.is_collective ? MAU_MAC_DINH.tap_the : MAU_MAC_DINH.ca_nhan);
    return dienMau(mauDung, giaTriCacO(p0, bc));
  }

  // Nhiều phiếu — dựng theo cấu trúc, giữ cùng bộ biểu tượng
  const dong: string[] = [];
  if (cheDo === 'gop_theo_nguoi_tang') {
    // Mẫu 3 — nhiều người, cùng người tặng
    dong.push(`⭐ ${soSao(tongSao).toUpperCase()} XỨNG ĐÁNG VỪA ĐƯỢC TRAO · ${ngay}`, '');
    if (p0.sender) dong.push(`🎁 Người tặng: ${p0.sender.trim()}`, '');
    const hien = nhom.slice(0, bc.toiDaDong);
    hien.forEach((p, i) => {
      const lyDo = cat(p.reason, bc.lyDoToiDaKyTu);
      dong.push(`${i + 1}. 🎉 ${tenNoiBat(p)} · ${soSao(Number(p.stars))}${lyDo ? ` — ${lyDo}` : ''}`);
    });
    if (nhom.length > hien.length) {
      const conLai = nhom.slice(hien.length).reduce((s, p) => s + Number(p.stars || 0), 0);
      dong.push(`… và ${soSao(conLai)} nữa cho ${nhom.length - hien.length} cán bộ khác`);
    }
  } else {
    // Một người nhận nhiều phiếu trong cửa sổ gom
    dong.push(p0.is_collective ? `⭐ SAO TẬP THỂ · ${ngay}` : `⭐ SAO XỨNG ĐÁNG · ${ngay}`);
    dong.push('', `🎉 Chúc mừng ${tenNoiBat(p0)} vừa nhận ${soSao(tongSao)}!`, '');
    const hien = nhom.slice(0, bc.toiDaDong);
    hien.forEach((p, i) => {
      const lyDo = cat(p.reason, bc.lyDoToiDaKyTu);
      const nt = p.sender ? ` (🎁 ${p.sender.trim()} tặng)` : '';
      dong.push(`${i + 1}. ${soSao(Number(p.stars))}${nt}${lyDo ? ` — 💬 ${lyDo}` : ''}`);
    });
    if (nhom.length > hien.length) dong.push(`… và ${nhom.length - hien.length} phiếu nữa`);
    const o = giaTriCacO(p0, bc, tongSao);
    if (p0.is_collective) {
      if (o.tich_luy) dong.push('', `📈 Tập thể đã có ${o.tich_luy} tích lũy`);
      dong.push('', '🤝 Chúc mừng cả tập thể!');
    } else if (o.tich_luy) {
      dong.push('', `📈 Tích lũy: ${o.tich_luy} · ${o.moc_qua}`);
    }
  }
  if (bc.linkChanTin.trim()) dong.push('', `👉 ${bc.linkChanTin.trim()}`);
  return dong.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
