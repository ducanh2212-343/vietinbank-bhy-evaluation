// Dùng bản LEGACY của pdf.js: bản chuẩn v6 yêu cầu JS rất mới
// (Map.getOrInsertComputed…) mà Chrome/Edge đời cũ trên máy văn phòng chưa có.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Worker self-host trong public/pdfjs — tuyệt đối không kéo từ CDN ngoài
// (ràng buộc bảo mật: nội dung kỷ yếu không được rời hạ tầng BHY ONE).
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

export type DoPhanGiai = 'thuong' | 'cao';

/**
 * Hợp đồng giữa engine lật trang và nơi cung cấp hình ảnh trang.
 *
 * Engine CHỈ được biết interface này: hôm nay trang đến từ PDF render bằng
 * pdf.js (phương án A), mai này đổi sang ảnh JPG render sẵn trên server
 * (phương án B) thì chỉ cần một implementation mới, engine giữ nguyên.
 */
export interface NguonTrang {
  soTrang: number;
  /** cao / rộng của trang (lấy từ trang 1, các trang sau coi như cùng khổ) */
  tyLe: number;
  layTrang(i: number, doPhanGiai?: DoPhanGiai): Promise<CanvasImageSource>;
  /** Ảnh thu nhỏ (~150px rộng) cho lưới trang — cache tách khỏi cache chính */
  layThuNho(i: number): Promise<CanvasImageSource>;
  /** Render nền các trang lân cận khi máy rảnh */
  napTruoc(danhSach: number[]): void;
  /** Cho nguồn biết bề rộng hiển thị hiện tại (px CSS) để chọn scale render */
  datBeRongHienThi(px: number): void;
  huy(): void;
}

interface YeuCauRender {
  trang: number;
  doPhanGiai: DoPhanGiai;
  /** nhỏ hơn = render trước */
  uuTien: number;
  resolve: (c: HTMLCanvasElement) => void;
  reject: (e: unknown) => void;
}

// Giới hạn cache theo đặc tả: 12 canvas chính, LRU. Ảnh thu nhỏ nhẹ (~150px)
// nên cho giữ toàn bộ — 40 trang thu nhỏ chưa tới 4MB RAM.
const CACHE_TOI_DA = 12;
const BE_RONG_THU_NHO = 150;
// Render dư 1.6× bề rộng hiển thị: đủ nét khi phóng nhẹ, không phí RAM máy yếu
const HE_SO_NET = 1.6;
const HE_SO_PHONG_TO = 2.5;

class NguonTrangPdf implements NguonTrang {
  soTrang: number;
  tyLe: number;

  private doc: PDFDocumentProxy;
  private beRongHienThi = 560;
  /** cache chính: key `${trang}` — chỉ bản 'thuong' */
  private cache = new Map<number, HTMLCanvasElement>();
  /** scale đã dùng để render từng canvas trong cache (đổi bề rộng → render lại) */
  private cacheScale = new Map<number, number>();
  private thuNho = new Map<number, HTMLCanvasElement>();
  private hangDoi: YeuCauRender[] = [];
  private dangRender = false;
  private daHuy = false;

  private constructor(doc: PDFDocumentProxy, tyLe: number, beRongTrangGoc: number) {
    this.doc = doc;
    this.soTrang = doc.numPages;
    this.tyLe = tyLe;
    this.beRongTrangGoc = beRongTrangGoc;
  }

  static async tao(nguon: { data?: ArrayBuffer; url?: string }): Promise<NguonTrangPdf> {
    const task = pdfjs.getDocument(
      nguon.data
        ? { data: nguon.data }
        : {
            url: nguon.url!,
            // Cho phép hiện bìa ngay khi dải byte đầu về tới nơi, phần còn lại
            // tải nền — người xem không phải đợi trọn file
            disableAutoFetch: false,
            disableStream: false,
          },
    );
    const doc = await task.promise;
    const p1 = await doc.getPage(1);
    const vp = p1.getViewport({ scale: 1 });
    return new NguonTrangPdf(doc, vp.height / vp.width, vp.width);
  }

  /** Lấy trọn dữ liệu file (để lưu IndexedDB cho lần mở sau) */
  async layDuLieuGoc(): Promise<Uint8Array> {
    return this.doc.getData();
  }

  datBeRongHienThi(px: number): void {
    // Làm tròn theo bậc 64px để tránh render lại liên tục khi kéo cửa sổ
    const moi = Math.max(256, Math.ceil(px / 64) * 64);
    if (moi !== this.beRongHienThi) this.beRongHienThi = moi;
  }

  layTrang(i: number, doPhanGiai: DoPhanGiai = 'thuong'): Promise<CanvasImageSource> {
    if (doPhanGiai === 'thuong') {
      const scaleCan = this.scaleThuong();
      const co = this.cache.get(i);
      // Chấp nhận canvas cũ nếu không mờ quá 25% so với yêu cầu hiện tại
      if (co && (this.cacheScale.get(i) ?? 0) >= scaleCan * 0.75) {
        this.ghiNhanDung(i);
        return Promise.resolve(co);
      }
    }
    return new Promise((resolve, reject) => {
      this.xepHang({ trang: i, doPhanGiai, uuTien: 0, resolve, reject });
    });
  }

  async layThuNho(i: number): Promise<CanvasImageSource> {
    const co = this.thuNho.get(i);
    if (co) return co;
    const canvas = await this.renderTrang(i, BE_RONG_THU_NHO / this.beRongTrangGoc);
    this.thuNho.set(i, canvas);
    return canvas;
  }

  napTruoc(danhSach: number[]): void {
    danhSach.forEach((trang, idx) => {
      if (trang < 1 || trang > this.soTrang) return;
      if (this.cache.has(trang)) return;
      if (this.hangDoi.some((y) => y.trang === trang && y.doPhanGiai === 'thuong')) return;
      this.xepHang({
        trang,
        doPhanGiai: 'thuong',
        uuTien: 1 + idx,
        resolve: () => {},
        reject: () => {},
      });
    });
  }

  huy(): void {
    this.daHuy = true;
    this.hangDoi = [];
    for (const c of this.cache.values()) c.width = 0;
    this.cache.clear();
    this.cacheScale.clear();
    for (const c of this.thuNho.values()) c.width = 0;
    this.thuNho.clear();
    void this.doc.cleanup().catch(() => {});
    void (this.doc.loadingTask as { destroy?: () => Promise<void> }).destroy?.();
  }

  // ----- nội bộ -----

  private beRongTrangGoc: number;

  private scaleThuong(): number {
    return (this.beRongHienThi * HE_SO_NET * (window.devicePixelRatio > 1 ? 1.25 : 1)) /
      Math.max(1, this.beRongTrangGoc);
  }

  private ghiNhanDung(i: number): void {
    // LRU: xóa rồi chèn lại để key nằm cuối Map (mới dùng nhất)
    const c = this.cache.get(i);
    if (c) {
      this.cache.delete(i);
      this.cache.set(i, c);
    }
  }

  private xepHang(yc: YeuCauRender): void {
    this.hangDoi.push(yc);
    this.hangDoi.sort((a, b) => a.uuTien - b.uuTien);
    void this.chayHangDoi();
  }

  private async chayHangDoi(): Promise<void> {
    if (this.dangRender || this.daHuy) return;
    const yc = this.hangDoi.shift();
    if (!yc) return;
    this.dangRender = true;
    try {
      // Yêu cầu nạp trước (uuTien > 0) chờ máy rảnh; yêu cầu đang xem chạy ngay
      if (yc.uuTien > 0) await choMayRanh();
      if (this.daHuy) return;

      if (yc.doPhanGiai === 'cao') {
        // Bản phóng to KHÔNG vào cache chính (nặng RAM) — dùng xong bỏ
        const canvas = await this.renderTrang(
          yc.trang,
          (this.beRongHienThi * HE_SO_PHONG_TO) / Math.max(1, this.beRongTrangGoc),
        );
        yc.resolve(canvas);
      } else {
        const scaleCan = this.scaleThuong();
        const co = this.cache.get(yc.trang);
        if (co && (this.cacheScale.get(yc.trang) ?? 0) >= scaleCan * 0.75) {
          this.ghiNhanDung(yc.trang);
          yc.resolve(co);
        } else {
          const canvas = await this.renderTrang(yc.trang, scaleCan);
          if (co) co.width = 0;
          this.cache.set(yc.trang, canvas);
          this.cacheScale.set(yc.trang, scaleCan);
          this.gioiHanCache();
          yc.resolve(canvas);
        }
      }
    } catch (e) {
      yc.reject(e);
    } finally {
      this.dangRender = false;
      if (this.hangDoi.length) void this.chayHangDoi();
    }
  }

  private gioiHanCache(): void {
    while (this.cache.size > CACHE_TOI_DA) {
      const cuNhat = this.cache.keys().next().value as number | undefined;
      if (cuNhat === undefined) break;
      const c = this.cache.get(cuNhat);
      if (c) c.width = 0; // trả RAM cho trình duyệt trước khi bỏ tham chiếu
      this.cache.delete(cuNhat);
      this.cacheScale.delete(cuNhat);
    }
  }

  private async renderTrang(i: number, scale: number): Promise<HTMLCanvasElement> {
    const page = await this.doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false })!;
    await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;
    return canvas;
  }
}

function choMayRanh(): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void })
        .requestIdleCallback(() => resolve(), { timeout: 800 });
    } else {
      setTimeout(resolve, 60);
    }
  });
}

export async function taoNguonTrangPdf(nguon: { data?: ArrayBuffer; url?: string }): Promise<NguonTrangPdf> {
  return NguonTrangPdf.tao(nguon);
}

export type { NguonTrangPdf };
