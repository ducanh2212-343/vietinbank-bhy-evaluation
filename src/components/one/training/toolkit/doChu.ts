import { uocKichThuoc, type KichThuocChu } from '@/lib/toolkit/mindmap';

/**
 * Đo chữ bằng canvas 2D để hộp nút mindmap khít với nội dung thật. Không có
 * canvas (kiểm thử, dựng trước) thì rơi về ước lượng thuần của lib.
 *
 * Cùng một font ở ba nơi — đo, vẽ SVG, xuất ảnh — nếu lệch một nơi là chữ tràn
 * hộp lúc xuất ảnh dù trên màn hình trông đúng.
 */
export const FONT_MINDMAP = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function fontTheoCap(capDo: number): { co: number; dam: number } {
  return capDo === 0 ? { co: 15, dam: 600 } : capDo === 1 ? { co: 14, dam: 500 } : { co: 13, dam: 400 };
}

export const DONG_CAO = 20;
const DEM_NGANG = 14;
const DEM_DOC = 8;
const RONG_TOI_DA = 240;
const RONG_CHU_TOI_DA = RONG_TOI_DA - DEM_NGANG * 2;

export interface ChuDaDo extends KichThuocChu { dong: string[] }

export function taoDoChu(): (vanBan: string, capDo: number) => ChuDaDo {
  const bo = new Map<string, ChuDaDo>();
  let ctx: CanvasRenderingContext2D | null = null;
  try { ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null; } catch { ctx = null; }

  return (vanBan, capDo) => {
    const khoa = `${capDo}|${vanBan}`;
    const cu = bo.get(khoa);
    if (cu) return cu;
    const chu = vanBan.trim() || 'Ý mới';
    let kq: ChuDaDo;
    if (!ctx) {
      const u = uocKichThuoc(chu, capDo);
      kq = { ...u, dong: [chu] };
    } else {
      const f = fontTheoCap(capDo);
      ctx.font = `${f.dam} ${f.co}px ${FONT_MINDMAP}`;
      // Xuống dòng theo từ; một từ dài hơn cả hộp thì cắt theo ký tự
      const dong: string[] = [];
      for (const doanGoc of chu.split('\n')) {
        let hien = '';
        for (const tu of doanGoc.split(/\s+/).filter(Boolean)) {
          const thu = hien ? `${hien} ${tu}` : tu;
          if (ctx.measureText(thu).width <= RONG_CHU_TOI_DA) { hien = thu; continue; }
          if (hien) dong.push(hien);
          hien = '';
          let manh = '';
          for (const ky of tu) {
            if (ctx.measureText(manh + ky).width > RONG_CHU_TOI_DA && manh) { dong.push(manh); manh = ''; }
            manh += ky;
          }
          hien = manh;
        }
        dong.push(hien);
      }
      const rongChu = Math.max(...dong.map((d) => ctx!.measureText(d).width), 20);
      kq = {
        dong,
        w: Math.min(Math.max(Math.ceil(rongChu) + DEM_NGANG * 2, 72), RONG_TOI_DA),
        h: dong.length * DONG_CAO + DEM_DOC * 2 + (capDo === 0 ? 8 : 0),
      };
    }
    bo.set(khoa, kq);
    return kq;
  };
}

/**
 * Chia một đoạn chữ thành các dòng vừa chiều rộng cho trước — dùng khi vẽ SVG
 * xuất ảnh của Mô hình 4 hộp (bảng vẽ HTML thì trình duyệt tự xuống dòng, SVG
 * thì không). Không có canvas thì ước 0,55 × cỡ chữ cho một ký tự.
 */
export function chiaDong(vanBan: string, rongToiDa: number, coChu: number, dam = 400): string[] {
  let ctx: CanvasRenderingContext2D | null = null;
  try { ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null; } catch { ctx = null; }
  if (ctx) ctx.font = `${dam} ${coChu}px ${FONT_MINDMAP}`;
  const rong = (s: string) => (ctx ? ctx.measureText(s).width : s.length * coChu * 0.55);
  const dong: string[] = [];
  for (const doan of vanBan.split('\n')) {
    let hien = '';
    for (const tu of doan.split(/\s+/).filter(Boolean)) {
      const thu = hien ? `${hien} ${tu}` : tu;
      if (rong(thu) <= rongToiDa) { hien = thu; continue; }
      if (hien) dong.push(hien);
      let manh = '';
      for (const ky of tu) {
        if (rong(manh + ky) > rongToiDa && manh) { dong.push(manh); manh = ''; }
        manh += ky;
      }
      hien = manh;
    }
    dong.push(hien);
  }
  return dong.length ? dong : [''];
}

/** Thoát ký tự đặc biệt khi ghép chuỗi SVG bằng tay */
export function thoatXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
