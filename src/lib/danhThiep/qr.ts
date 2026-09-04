/**
 * Sinh mã QR cho danh thiếp số — chạy trên trình duyệt của Phòng TCTH.
 *
 * Mục 7.4 đặc tả: mức sửa lỗi H, logo chèn giữa chiếm ≤ 25% diện tích, vùng
 * trống 4 mô-đun, xuất PNG 1024×1024 và SVG. Ở đây logo rộng 44% cạnh mã →
 * diện tích ≈ 12%, còn dư nhiều biên an toàn của mức H (khôi phục 30%) — cố ý
 * không tận dụng hết vì thẻ in 2,5 cm còn phải quét được ở 30 cm, 200 lux.
 */
import QRCode from 'qrcode';

const KICH_THUOC = 1024;
const VUNG_TRONG = 4;
const TI_LE_LOGO = 0.44;
/** Tỉ lệ khung của logo (144.39 × 87.85 theo tệp public/brand/logo-cn-bhy.svg) */
const KHUNG_LOGO = 144.39 / 87.85;

let logoCache: Promise<string> | null = null;

/** Nội dung SVG của logo (đọc một lần từ public/brand). */
function napLogoSvg(): Promise<string> {
  if (!logoCache) {
    logoCache = fetch('/brand/logo-cn-bhy.svg').then((r) => {
      if (!r.ok) throw new Error('Không đọc được logo');
      return r.text();
    });
    logoCache.catch(() => { logoCache = null; });
  }
  return logoCache;
}

function svgSangDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function napAnh(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, loi) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => loi(new Error('Không dựng được ảnh logo'));
    img.src = src;
  });
}

function veHinhChuNhatBo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface TuyChonQr {
  /** Chèn logo VietinBank giữa mã — chỉ cho mẫu thẻ chính thức và khi logo_enabled */
  logo?: boolean;
}

/** PNG 1024×1024 (Blob) — in name card, chữ ký email. */
export async function taoQrPng(url: string, tuyChon: TuyChonQr = {}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, {
    errorCorrectionLevel: 'H', margin: VUNG_TRONG, width: KICH_THUOC,
    color: { dark: '#12202EFF', light: '#FFFFFFFF' },
  });
  if (tuyChon.logo) {
    const ctx = canvas.getContext('2d')!;
    const img = await napAnh(svgSangDataUri(await napLogoSvg()));
    // Cạnh vùng mã (không tính vùng trống) để tính tỉ lệ logo
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' });
    const soMo = modules.size;
    const cotMo = KICH_THUOC / (soMo + VUNG_TRONG * 2);
    const vungMa = soMo * cotMo;
    const w = Math.round(vungMa * TI_LE_LOGO);
    const h = Math.round(w / KHUNG_LOGO);
    const dem = Math.round(cotMo * 0.9);
    const x = Math.round((KICH_THUOC - w) / 2);
    const y = Math.round((KICH_THUOC - h) / 2);
    ctx.fillStyle = '#fff';
    veHinhChuNhatBo(ctx, x - dem, y - dem, w + dem * 2, h + dem * 2, Math.round(cotMo * 1.2));
    ctx.fill();
    ctx.drawImage(img, x, y, w, h);
  }
  return new Promise((ok, loi) => canvas.toBlob((b) => (b ? ok(b) : loi(new Error('Không xuất được PNG'))), 'image/png'));
}

/** SVG vector — nhà in phóng bao nhiêu cũng nét. */
export async function taoQrSvg(url: string, tuyChon: TuyChonQr = {}): Promise<string> {
  let svg = await QRCode.toString(url, {
    type: 'svg', errorCorrectionLevel: 'H', margin: VUNG_TRONG,
    color: { dark: '#12202E', light: '#FFFFFF' },
  });
  if (!tuyChon.logo) return svg;
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const soMo = modules.size;
  const canh = soMo + VUNG_TRONG * 2; // viewBox của thư viện: 0 0 canh canh
  const w = soMo * TI_LE_LOGO;
  const h = w / KHUNG_LOGO;
  const x = (canh - w) / 2;
  const y = (canh - h) / 2;
  const dem = 0.9;
  const logo = svgSangDataUri(await napLogoSvg());
  const chen =
    `<rect x="${(x - dem).toFixed(2)}" y="${(y - dem).toFixed(2)}" width="${(w + dem * 2).toFixed(2)}" height="${(h + dem * 2).toFixed(2)}" rx="1.2" fill="#fff"/>` +
    `<image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" href="${logo}"/>`;
  svg = svg.replace(/<\/svg>\s*$/, `${chen}</svg>`);
  return svg;
}

/** Tải một Blob về máy với tên tệp cho trước. */
export function taiTepVeMay(blob: Blob, ten: string): void {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
