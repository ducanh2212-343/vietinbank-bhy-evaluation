/**
 * MẪU ẢNH cho mã lưu nhanh — cán bộ chọn mẫu, tải PNG về in hoặc gửi Zalo.
 *
 * Bốn mẫu, mỗi mẫu một cảnh dùng thật:
 *   qr_tron        mã trần 1024×1024 — dán vào tài liệu, chữ ký, in sticker
 *   qr_thuong_hieu ảnh dọc 3:4 có logo Chi nhánh, tên, số — gửi Zalo, in A6
 *   name_card      90×51 mm (300 dpi) — name card một mặt: thông tin + mã
 *   bien_ban       A6 dọc — biển để bàn tư vấn / bảng tên đeo cổ ở hội trường
 *
 * Nguyên tắc để camera điện thoại quét được trên MỌI mẫu: mã vẽ ở mức sửa lỗi
 * M, không logo chèn giữa, nền trắng tinh, mỗi ô ≥ 8 px trong ảnh và vùng lặng
 * 4 ô do thư viện tự chừa; cỡ in tối thiểu ghi trong TEN_MAU để cán bộ biết.
 * Vẽ bằng Canvas thuần — không thêm thư viện vào gói của cán bộ.
 */

import { napLogoAnh, TI_LE_KHUNG_LOGO, veQrThuanRaCanvas } from './qr';

export type MauAnh = 'qr_tron' | 'qr_thuong_hieu' | 'name_card' | 'bien_ban';

export const CAC_MAU: MauAnh[] = ['qr_tron', 'qr_thuong_hieu', 'name_card', 'bien_ban'];

export const TEN_MAU: Record<MauAnh, { ten: string; dung: string; coIn: string }> = {
  qr_tron: { ten: 'Mã QR trần', dung: 'Dán vào tài liệu, chữ ký email, in sticker', coIn: 'in ≥ 3 cm' },
  qr_thuong_hieu: { ten: 'Mã có thương hiệu', dung: 'Gửi Zalo cho khách, in A6 phát tại quầy', coIn: 'in A6 hoặc lớn hơn' },
  name_card: { ten: 'Name card một mặt', dung: 'Nền xanh VietinBank; tên, chức danh, đơn vị, số và mã trên một mặt 90×51 mm', coIn: 'in đúng 90×51 mm' },
  bien_ban: { ten: 'Biển để bàn / bảng tên', dung: 'Đặt bàn tư vấn, đeo cổ ở hội trường đền bù', coIn: 'in A6 đứng, ép plastic' },
};

/** Dữ liệu vẽ lên mẫu; tên và số là bắt buộc, phần còn lại có gì vẽ nấy. */
export interface DuLieuMau {
  /** Nội dung vCard sẽ mã hoá — phải là chuỗi taoVcardNhanh() trả về */
  vcard: string;
  /** Tên đúng như hiện trong danh bạ khách */
  ten: string;
  /** Số điện thoại hiện dưới mã, dạng dễ đọc */
  sdt: string;
  chucDanh?: string;
  donVi?: string;
  email?: string;
}

const NAVY = '#12202E';
/** Xanh VietinBank — đúng màu trong tệp logo public/brand/logo-cn-bhy.svg */
const XANH_VTB = '#0E5A94';
const DONG = '#A8763E';
const XAM = '#5B6874';
const TRANG_MO = 'rgba(255,255,255,0.82)';
const FONT = 'Inter, "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Chờ font Inter sẵn sàng để chữ trên canvas không rơi về font hệ thống nửa chừng. */
async function choFont(): Promise<void> {
  try {
    await Promise.all(['700 48px Inter', '500 32px Inter', '400 28px Inter'].map((f) => document.fonts.load(f)));
  } catch {
    /* trình duyệt cũ không có document.fonts: vẽ bằng font sẵn có */
  }
}

/** Vẽ một dòng chữ, tự co cỡ chữ tới khi vừa chiều rộng cho phép. */
function veChuVua(
  ctx: CanvasRenderingContext2D, chu: string, x: number, y: number, rongToiDa: number,
  coChu: number, dam: 400 | 500 | 600 | 700, mau: string, canh: CanvasTextAlign = 'left', coToiThieu = 18,
): number {
  let co = coChu;
  ctx.fillStyle = mau;
  ctx.textAlign = canh;
  ctx.textBaseline = 'alphabetic';
  for (;;) {
    ctx.font = `${dam} ${co}px ${FONT}`;
    if (ctx.measureText(chu).width <= rongToiDa || co <= coToiThieu) break;
    co -= 2;
  }
  ctx.fillText(chu, x, y);
  return co;
}

/** Nhiều dòng: cắt theo từ, tối đa `soDong` dòng, dòng cuối thêm «…» nếu thừa. */
function veNhieuDong(
  ctx: CanvasRenderingContext2D, chu: string, x: number, y: number, rongToiDa: number,
  coChu: number, dam: 400 | 500 | 600 | 700, mau: string, soDong: number, canh: CanvasTextAlign = 'left',
): number {
  ctx.font = `${dam} ${coChu}px ${FONT}`;
  ctx.fillStyle = mau;
  ctx.textAlign = canh;
  ctx.textBaseline = 'alphabetic';
  const tu = chu.split(/\s+/).filter(Boolean);
  const dong: string[] = [];
  let hienTai = '';
  for (const t of tu) {
    const thu = hienTai ? `${hienTai} ${t}` : t;
    if (ctx.measureText(thu).width <= rongToiDa) hienTai = thu;
    else { if (hienTai) dong.push(hienTai); hienTai = t; }
  }
  if (hienTai) dong.push(hienTai);
  const hien = dong.slice(0, soDong);
  if (dong.length > soDong) {
    let cuoi = hien[soDong - 1];
    while (ctx.measureText(`${cuoi}…`).width > rongToiDa && cuoi.length > 1) cuoi = cuoi.slice(0, -1);
    hien[soDong - 1] = `${cuoi}…`;
  }
  const cach = coChu * 1.3;
  hien.forEach((d, i) => ctx.fillText(d, x, y + i * cach));
  return y + (hien.length - 1) * cach;
}

function veLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, x: number, y: number, cao: number, canh: 'trai' | 'giua', rongKhung: number) {
  if (!logo) return;
  const rong = cao * TI_LE_KHUNG_LOGO;
  const xVe = canh === 'giua' ? x + (rongKhung - rong) / 2 : x;
  ctx.drawImage(logo, xVe, y, rong, cao);
}

function canvasRaPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, loi) => c.toBlob((b) => (b ? ok(b) : loi(new Error('Không tạo được PNG'))), 'image/png'));
}

/** Số ô mã mỗi px: kiểm mẫu có đủ lớn cho camera không (≥ 8 px/ô). */
function kiemCoO(qr: HTMLCanvasElement, canhVe: number, soO: number): void {
  const pxMoiO = canhVe / (soO + 8); // +8: vùng lặng 4 ô mỗi bên
  if (pxMoiO < 8) throw new Error('Mã quá dày cho mẫu này — rút ngắn tên để mã thưa hơn');
  void qr;
}

async function napLogoAnToan(): Promise<HTMLImageElement | null> {
  try { return await napLogoAnh(); } catch { return null; }
}

/** Số ô một cạnh của mã QR đã vẽ (thư viện vẽ vuông, đếm từ kích thước). */
function soOTuVcard(vcard: string): number {
  // Ước lượng đủ dùng để kiểm cỡ ô: version ≈ theo độ dài; thực tế dùng soOMotCanh ở nơi gọi
  const byte = new TextEncoder().encode(vcard).length;
  if (byte <= 106) return 33;
  if (byte <= 134) return 37;
  if (byte <= 154) return 41;
  if (byte <= 192) return 45;
  if (byte <= 230) return 49;
  if (byte <= 271) return 53;
  return 57;
}

// ---------------------------------------------------------------------------
// Mẫu 1: mã trần
// ---------------------------------------------------------------------------
async function veQrTron(d: DuLieuMau): Promise<HTMLCanvasElement> {
  return veQrThuanRaCanvas(d.vcard, 1024);
}

// ---------------------------------------------------------------------------
// Mẫu 2: mã có thương hiệu — 1080×1440, gửi Zalo / in A6
// ---------------------------------------------------------------------------
async function veQrThuongHieu(d: DuLieuMau): Promise<HTMLCanvasElement> {
  const W = 1080; const H = 1440;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  const logo = await napLogoAnToan();
  veLogo(ctx, logo, 0, 64, 120, 'giua', W);
  ctx.fillStyle = DONG; ctx.fillRect(W / 2 - 60, 220, 120, 4);

  const canhQr = 760;
  const qr = await veQrThuanRaCanvas(d.vcard, canhQr);
  kiemCoO(qr, canhQr, soOTuVcard(d.vcard));
  ctx.drawImage(qr, (W - canhQr) / 2, 250);

  veChuVua(ctx, d.ten, W / 2, 1090, W - 120, 60, 700, NAVY, 'center', 34);
  veChuVua(ctx, d.sdt, W / 2, 1160, W - 120, 48, 600, DONG, 'center');
  veNhieuDong(ctx, 'Mở Máy ảnh, chĩa vào mã, bấm dòng chữ hiện lên để lưu số', W / 2, 1240, W - 120, 30, 400, XAM, 2, 'center');

  ctx.fillStyle = NAVY; ctx.fillRect(0, H - 96, W, 96);
  veChuVua(ctx, 'VietinBank – Chi nhánh Bắc Hưng Yên', W / 2, H - 38, W - 80, 30, 600, '#FFFFFF', 'center');
  return c;
}

// ---------------------------------------------------------------------------
// Mẫu 3: name card một mặt — 1063×602 (90×51 mm ở 300 dpi), tông xanh VietinBank
//
// Nền xanh, chữ trắng. Mã QR và logo đặt trong KHUNG TRẮNG vì hai lý do thật:
// camera cần vùng lặng sáng quanh mã (mã đen trên nền xanh quét kém hẳn), và
// logo vốn màu xanh VietinBank nên đặt thẳng lên nền xanh là chìm mất.
// ---------------------------------------------------------------------------
function veKhungTrang(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

async function veNameCard(d: DuLieuMau): Promise<HTMLCanvasElement> {
  const W = 1063; const H = 602;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = XANH_VTB; ctx.fillRect(0, 0, W, H);
  // Dải đồng mảnh dưới đáy — điểm nhấn thương hiệu Chi nhánh, không át mã
  ctx.fillStyle = DONG; ctx.fillRect(0, H - 10, W, 10);

  // Logo trong khung trắng góc trên trái
  const logo = await napLogoAnToan();
  const caoLogo = 64;
  const rongLogo = caoLogo * TI_LE_KHUNG_LOGO;
  veKhungTrang(ctx, 48, 40, rongLogo + 36, caoLogo + 24, 14);
  veLogo(ctx, logo, 66, 52, caoLogo, 'trai', 0);

  // Cột trái chữ trắng
  const rongTrai = 520;
  let y = 214;
  const coTen = veChuVua(ctx, d.ten, 60, y, rongTrai, 44, 700, '#FFFFFF', 'left', 26);
  y += Math.round(coTen * 0.4) + 34;
  if (d.chucDanh) { veChuVua(ctx, d.chucDanh, 60, y, rongTrai, 28, 500, '#FFFFFF'); y += 42; }
  if (d.donVi) { y = veNhieuDong(ctx, d.donVi, 60, y, rongTrai, 24, 400, TRANG_MO, 2) + 44; }
  veChuVua(ctx, d.sdt, 60, y, rongTrai, 32, 600, '#FFFFFF'); y += 42;
  if (d.email) veChuVua(ctx, d.email, 60, y, rongTrai, 22, 400, TRANG_MO);

  // Mã trong khung trắng bên phải; thư viện đã chừa 4 ô lặng, khung thêm 16 px cho chắc
  const canhQr = 440;
  const qr = await veQrThuanRaCanvas(d.vcard, canhQr);
  kiemCoO(qr, canhQr, soOTuVcard(d.vcard));
  const xQr = W - canhQr - 56; const yQr = (H - canhQr) / 2 - 6;
  veKhungTrang(ctx, xQr - 16, yQr - 16, canhQr + 32, canhQr + 32, 18);
  ctx.drawImage(qr, xQr, yQr);
  veChuVua(ctx, 'Quét để lưu số', xQr + canhQr / 2, H - 34, canhQr, 20, 500, '#FFFFFF', 'center');
  return c;
}

// ---------------------------------------------------------------------------
// Mẫu 4: biển để bàn / bảng tên — A6 dọc 1240×1748 (300 dpi)
// ---------------------------------------------------------------------------
async function veBienBan(d: DuLieuMau): Promise<HTMLCanvasElement> {
  const W = 1240; const H = 1748;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 150);
  veChuVua(ctx, 'VietinBank – Chi nhánh Bắc Hưng Yên', W / 2, 94, W - 120, 40, 600, '#FFFFFF', 'center');

  const canhQr = 1000;
  const qr = await veQrThuanRaCanvas(d.vcard, canhQr);
  kiemCoO(qr, canhQr, soOTuVcard(d.vcard));
  ctx.drawImage(qr, (W - canhQr) / 2, 200);

  veChuVua(ctx, d.ten, W / 2, 1310, W - 120, 84, 700, NAVY, 'center', 40);
  veChuVua(ctx, d.sdt, W / 2, 1400, W - 120, 64, 600, DONG, 'center');
  veNhieuDong(ctx, 'Mời bác mở Máy ảnh, chĩa vào mã rồi bấm Lưu', W / 2, 1500, W - 160, 40, 400, XAM, 2, 'center');

  const logo = await napLogoAnToan();
  veLogo(ctx, logo, 0, H - 150, 90, 'giua', W);
  return c;
}

/** Vẽ mẫu đã chọn, trả PNG. */
export async function veMauAnh(mau: MauAnh, d: DuLieuMau): Promise<Blob> {
  await choFont();
  const c = mau === 'qr_tron' ? await veQrTron(d)
    : mau === 'qr_thuong_hieu' ? await veQrThuongHieu(d)
      : mau === 'name_card' ? await veNameCard(d)
        : await veBienBan(d);
  return canvasRaPng(c);
}

/** Tên tệp: <TenKhongDau>-<mau>.png */
export function tenTepMau(mau: MauAnh, tenKhongDau: string): string {
  const t = tenKhongDau.replace(/[^A-Za-z0-9]+/g, '') || 'VietinBank';
  const duoi: Record<MauAnh, string> = { qr_tron: 'qr', qr_thuong_hieu: 'qr-thuong-hieu', name_card: 'name-card', bien_ban: 'bien-ban' };
  return `${t}-${duoi[mau]}.png`;
}
