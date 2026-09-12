// Mẫu tin Sao Xứng Đáng gửi vào nhóm Zalo — HÀM THUẦN, không phụ thuộc Deno hay
// Supabase, để kiểm thử được từ vitest (src/pages/__tests__/zaloSaoMau.test.ts).
//
// Giám đốc chốt 12/09/2026: lý do nguyên văn (không che), kèm sao tích lũy và
// mốc quà kế tiếp, mỗi người nhận một tin riêng, chân tin là đường dẫn về cổng.
// Chuẩn hình thức push 09/08: mỗi dòng một nhãn, không nối bằng «·» trong thân.

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
 * Soạn MỘT tin cho một nhóm phiếu đã gom (cùng khóa). Phiếu đầu tiên quyết định
 * người/tập thể; các phiếu sau chỉ thêm dòng.
 */
export function soanTinSao(nhom: PhieuSao[], cheDo: CheDoGop, bc: BoiCanhTin): string {
  if (nhom.length === 0) return '';
  const ngay = ngayVn(nhom[0].awarded_on);
  const tongSao = nhom.reduce((s, p) => s + Number(p.stars || 0), 0);
  const dong: string[] = [];

  if (cheDo === 'gop_theo_nguoi_tang' && nhom.length > 1) {
    // Mẫu 3 — nhiều người, cùng người tặng
    dong.push(`⭐ ${soSao(tongSao).toUpperCase()} XỨNG ĐÁNG VỪA ĐƯỢC TRAO · ${ngay}`);
    if (nhom[0].sender) dong.push(`Người tặng: ${nhom[0].sender.trim()}`);
    const hien = nhom.slice(0, bc.toiDaDong);
    hien.forEach((p, i) => {
      const lyDo = cat(p.reason, bc.lyDoToiDaKyTu);
      dong.push(`${i + 1}. ${tenNguoi(p)} · ${soSao(Number(p.stars))}${lyDo ? ` — ${lyDo}` : ''}`);
    });
    if (nhom.length > hien.length) {
      const conLai = nhom.slice(hien.length).reduce((s, p) => s + Number(p.stars || 0), 0);
      dong.push(`… và ${soSao(conLai)} nữa cho ${nhom.length - hien.length} cán bộ khác`);
    }
  } else {
    const p0 = nhom[0];
    dong.push(p0.is_collective ? `⭐ SAO TẬP THỂ · ${ngay}` : `⭐ SAO XỨNG ĐÁNG · ${ngay}`);
    dong.push(`${tenNguoi(p0)} vừa nhận ${soSao(tongSao)}`);
    if (nhom.length === 1) {
      // Mẫu 1 / Mẫu 2
      if (p0.sender) dong.push(`Người tặng: ${p0.sender.trim()}`);
      const lyDo = cat(p0.reason, bc.lyDoToiDaKyTu);
      if (lyDo) dong.push(`Vì đã: ${lyDo}`);
      const kq = cat(p0.result, bc.lyDoToiDaKyTu);
      // «Kết quả» ở phiếu cũ đôi khi chỉ là «1» — bỏ qua thứ không phải câu chữ
      if (kq && kq.length > 3 && kq !== lyDo) dong.push(`Kết quả: ${kq}`);
    } else {
      // Một người nhận nhiều phiếu trong cửa sổ gom
      const hien = nhom.slice(0, bc.toiDaDong);
      hien.forEach((p, i) => {
        const lyDo = cat(p.reason, bc.lyDoToiDaKyTu);
        const nt = p.sender ? ` (${p.sender.trim()} tặng)` : '';
        dong.push(`${i + 1}. ${soSao(Number(p.stars))}${nt}${lyDo ? ` — ${lyDo}` : ''}`);
      });
      if (nhom.length > hien.length) dong.push(`… và ${nhom.length - hien.length} phiếu nữa`);
    }
    if (p0.is_collective) {
      if (bc.tichLuy != null && bc.tichLuy > tongSao) dong.push(`Tập thể đã có ${soSao(bc.tichLuy)} tích lũy`);
      dong.push('🎉 Chúc mừng cả tập thể!');
    } else if (bc.tichLuy != null) {
      dong.push(`Tích lũy: ${soSao(bc.tichLuy)}${bc.mocQua ? ` · ${bc.mocQua}` : ' · Đã chạm mốc cao nhất 🏆'}`);
    }
  }

  if (bc.linkChanTin) dong.push(`👉 ${bc.linkChanTin}`);
  return dong.join('\n');
}
