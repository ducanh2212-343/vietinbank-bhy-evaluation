/**
 * Engine cuộn giấy — mô phỏng tờ giấy mỏng cuộn lại khi lật, vẽ bằng canvas 2D.
 *
 * KHÔNG dùng CSS rotateY (trông như bìa cứng). Mô hình vật lý: giấy không co
 * giãn, tổng chiều dài luôn bằng bề rộng trang W, chia 3 đoạn
 *
 *   W = F + πr + L
 *       │    │    └─ L: phần đã úp ngược, nằm đè lên phần phẳng
 *       │    └────── πr: cung cuộn (nửa hình trụ bán kính r)
 *       └─────────── F: phần còn phẳng, từ gáy tới điểm giấy nhấc lên
 *
 * d ∈ [-W, W] là vị trí mép tự do (d = W: phẳng; d = -W: đã lật úp sang trái).
 * Bất biến kiểm chứng được: F − L = d và F + πr + L = W tại mọi thời điểm
 * (sai số ≤ 1px do chặn sàn bán kính r ≥ 0.6 ở hai đầu hành trình).
 */

export interface KetQuaCuon {
  /** tiến độ lật 0 → 1 */
  p: number;
  /** bán kính cung cuộn */
  r: number;
  /** chiều dài phần còn phẳng */
  F: number;
  /** chiều dài cung πr */
  arc: number;
  /** chiều dài phần đã úp ngược */
  L: number;
}

export function tinhCuon(d: number, W: number): KetQuaCuon {
  const p = (W - d) / (2 * W);
  let r = W * 0.13 * Math.sin(Math.PI * p) + 0.6; // phồng nhất ở giữa, phẳng hai đầu
  r = Math.min(
    r,
    ((W - d) / Math.PI) * 0.94, // ràng buộc L ≥ 0
    ((W + d) / Math.PI) * 0.94, // ràng buộc F ≥ 0
  );
  r = Math.max(r, 0.6);
  const F = Math.max(0, (d + W - Math.PI * r) / 2);
  const arc = Math.PI * r;
  const L = Math.max(0, W - F - arc);
  return { p, r, F, arc, L };
}

export interface ThamSoVe {
  /** bề rộng một trang (px canvas) */
  W: number;
  /** chiều cao trang (px canvas) */
  H: number;
  /** hoành độ gáy sách trong hệ tọa độ canvas */
  gayX: number;
  /** +1: lật trang phải (tiến); -1: lật trang trái (lùi) */
  huong: 1 | -1;
  d: number;
  /** mặt trước của tờ đang lật (đã lật gương sẵn nếu huong = -1) */
  matTruoc: CanvasImageSource;
  /** mặt sau của tờ (đã lật gương sẵn nếu huong = -1) */
  matSau: CanvasImageSource;
  IW: number;
  IH: number;
}

/**
 * Vẽ tờ đang lật lên ctx (canvas phủ toàn khung sách, đã xóa sạch trước đó).
 *
 * Lật trang trái dùng CÙNG hàm này: bọc ctx.scale(-1,1) quanh gáy và truyền
 * mặt trước/sau ĐÃ LẬT GƯƠNG (xem lamGuong) — gương kép nên chữ vẫn xuôi,
 * không cần hàm vẽ thứ hai.
 */
export function veCuonGiay(ctx: CanvasRenderingContext2D, ts: ThamSoVe): void {
  const { W, H, gayX, huong, d, matTruoc, matSau, IW, IH } = ts;
  const { r, F, arc, L } = tinhCuon(d, W);

  ctx.save();
  ctx.translate(gayX, 0);
  if (huong < 0) ctx.scale(-1, 1);

  // ---- 1. Bóng của nếp cuộn hắt lên trang bên dưới đang lộ ra ----
  {
    const rong = Math.min(0.16 * W, 3 * r + 14);
    const g = ctx.createLinearGradient(F + r, 0, F + r + rong, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.34)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(F + r, 0, rong, H);
  }

  // ---- 2. Phần giấy còn phẳng ----
  if (F > 0.5) {
    ctx.drawImage(matTruoc, 0, 0, (IW * F) / W, IH, 0, 0, F, H);
  }

  // ---- 3. Bóng của phần úp ngược đổ xuống phần phẳng ----
  if (L > 0.5) {
    const rong = Math.min(46, 0.12 * W);
    const g = ctx.createLinearGradient(F - L, 0, F - L - rong, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.40)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(F - L - rong, 0, rong, H);
  }

  // ---- 4. Phần giấy đã úp ngược (mặt sau, đè lên phần phẳng) ----
  if (L > 0.5) {
    // Mặt sau soi ngược nên gáy nằm bên phải ảnh: cột nguồn = IW·(1 − u/W).
    // Mép tự do (u = W, cột 0) chạm đúng x = F − L = d — giấy bám ngón tay.
    const srcW = Math.max(0, IW * (1 - (F + arc) / W));
    if (srcW >= 0.5) {
      ctx.drawImage(matSau, 0, 0, srcW, IH, F - L, 0, L, H);
      const g = ctx.createLinearGradient(F - L, 0, F, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.05)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.13)');
      g.addColorStop(1, 'rgba(0,0,0,0.30)');
      ctx.fillStyle = g;
      ctx.fillRect(F - L, 0, L, H);
    }
  }

  // ---- 5. Cung cuộn: chia dải mảnh theo φ, mỗi dải một lát cột ảnh ----
  const N = Math.min(90, Math.max(18, Math.round(arc / 1.6)));
  for (let k = 0; k < N; k++) {
    const phi0 = (k * Math.PI) / N;
    const phi1 = ((k + 1) * Math.PI) / N;
    const u0 = F + phi0 * r;
    let u1 = F + phi1 * r;
    // Sàn bán kính r ≥ 0.6 khiến F + πr có thể dư ~1px quá mép giấy — cắt bỏ
    if (u0 >= W) break;
    u1 = Math.min(u1, W);
    const phiMid = ((u0 + u1) / 2 - F) / r;
    const x0 = F + r * Math.sin((u0 - F) / r);
    const x1 = F + r * Math.sin((u1 - F) / r);

    if (phiMid < Math.PI / 2) {
      // Mặt trước: cột nguồn IW·u/W, hoành độ tăng theo u
      const c0 = (IW * u0) / W;
      const c1 = (IW * u1) / W;
      const rongVe = Math.abs(x1 - x0) + 0.7; // +0.7px chống khe răng cưa
      if (c1 - c0 >= 0.1 && rongVe > 0) {
        ctx.drawImage(matTruoc, c0, 0, c1 - c0, IH, Math.min(x0, x1), 0, rongVe, H);
        ctx.fillStyle = `rgba(0,0,0,${0.42 * Math.pow(Math.sin(phiMid), 1.3)})`;
        ctx.fillRect(Math.min(x0, x1), 0, rongVe, H);
      }
    } else {
      // Mặt sau: cột nguồn IW·(1 − u/W) giảm theo u, hoành độ cũng giảm —
      // hai hướng cùng dấu nên drawImage thẳng, không phải lật trục
      const c0 = IW * (1 - u1 / W); // mép trái nguồn ↔ u lớn ↔ x nhỏ
      const c1 = IW * (1 - u0 / W);
      const rongVe = Math.abs(x0 - x1) + 0.7;
      if (c1 - c0 >= 0.1 && rongVe > 0) {
        ctx.drawImage(matSau, c0, 0, c1 - c0, IH, Math.min(x0, x1), 0, rongVe, H);
        ctx.fillStyle = `rgba(0,0,0,${0.2 + 0.34 * Math.sin(phiMid)})`;
        ctx.fillRect(Math.min(x0, x1), 0, rongVe, H);
        // Vệt sáng liếm trên đỉnh cuộn
        if (phiMid > 2.05 && phiMid < 2.75) {
          const s = Math.sin((Math.PI * (phiMid - 2.05)) / 0.7);
          ctx.fillStyle = `rgba(255,255,255,${0.1 * Math.max(0, s)})`;
          ctx.fillRect(Math.min(x0, x1), 0, rongVe, H);
        }
      }
    }
  }

  ctx.restore();
}

/** Bản sao lật gương ngang — dùng cho lật trang trái (gương kép giữ chữ xuôi). */
export function lamGuong(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Trang gáy nền kem cho mặt sau tờ cuối khi tổng số trang lẻ. */
export function taoTrangGay(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F3EBDD';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#A8763E';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const co = Math.max(12, Math.round(c.width / 22));
  ctx.font = `600 ${co}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('VIETINBANK BẮC HƯNG YÊN', c.width / 2, c.height / 2 - co * 0.8);
  ctx.font = `${Math.round(co * 0.85)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('2006 — 2026', c.width / 2, c.height / 2 + co * 0.8);
  return c;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
