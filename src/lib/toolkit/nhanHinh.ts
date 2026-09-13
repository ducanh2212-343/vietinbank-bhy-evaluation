/**
 * NHẬN HÌNH TỪ NÉT VẼ TAY — như «giữ bút yên» trong Freeform / Notes / Pages
 * của Apple (Giám đốc 13/09: «tự động bo tròn đường viết tay, tự tạo hình tròn,
 * hình vuông… tự làm thẳng đường vẽ tay»): vẽ một vòng méo rồi dừng bút nửa giây, nét thành hình tròn; vẽ một
 * gạch run tay, thành đường thẳng; bốn cạnh xiêu vẹo, thành chữ nhật.
 *
 * Thuật toán thuần, không học máy, để chạy tức thì trên điện thoại và kiểm
 * thử được:
 *   1. Lấy mẫu lại thành 64 điểm cách đều theo chiều dài nét — tay vẽ chậm chỗ
 *      này nhanh chỗ kia, không lấy mẫu lại thì góc nhọn bị «trọng số» lệch.
 *   2. Đường thẳng: hai đầu xa nhau gần bằng chiều dài nét và mọi điểm sát đoạn
 *      nối hai đầu.
 *   3. Nét khép kín (đầu cuối gần nhau): rút gọn Douglas–Peucker để đếm góc —
 *      3 góc là tam giác, 4 là chữ nhật (cạnh gần trục thì ép vào khung bao,
 *      không thì giữ tứ giác); nhiều góc mà bán kính chuẩn hoá theo khung bao
 *      đều nhau thì elip (gần đều hai chiều thì tròn hẳn).
 *   4. Không khớp gì thì trả null — giữ nguyên nét tay, không đoán bừa.
 *
 * Ngưỡng chọn theo thử tay: nét méo 10 % vẫn nhận, chữ viết thì không (chữ có
 * đầu cuối xa nhau lẫn nhiều góc nên rơi vào null).
 */

export type LoaiHinh = 'DUONG' | 'TRON' | 'ELIP' | 'CHU_NHAT' | 'TU_GIAC' | 'TAM_GIAC';

export interface HinhNhan {
  loai: LoaiHinh;
  /** Dãy điểm phẳng [x, y, p, …] của hình đã chuẩn — vẽ y như một nét thường, áp lực đều 0,5 */
  diem: number[];
}

type D = [number, number];

const SO_MAU = 64;
/** Khoảng cách mẫu khi dựng lại hình, px của bảng vẽ — đủ dày để perfect-freehand vẽ trơn */
const BUOC_DUNG = 6;

function taiXY(diem: number[]): D[] {
  const ra: D[] = [];
  for (let i = 0; i + 1 < diem.length; i += 3) ra.push([diem[i], diem[i + 1]]);
  return ra;
}

function chieuDai(p: D[]): number {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return l;
}

/** Lấy mẫu lại thành n điểm cách đều theo chiều dài */
export function layMauLai(p: D[], n = SO_MAU): D[] {
  if (p.length < 2) return p.slice();
  const buoc = chieuDai(p) / (n - 1);
  if (buoc === 0) return p.slice(0, 1);
  const ra: D[] = [p[0]];
  let du = 0;
  const con = p.slice();
  for (let i = 1; i < con.length; i++) {
    const [ax, ay] = con[i - 1]; const [bx, by] = con[i];
    const d = Math.hypot(bx - ax, by - ay);
    if (du + d >= buoc && d > 0) {
      const t = (buoc - du) / d;
      const q: D = [ax + t * (bx - ax), ay + t * (by - ay)];
      ra.push(q);
      con.splice(i, 0, q);
      du = 0;
    } else du += d;
  }
  while (ra.length < n) ra.push(p[p.length - 1]);
  return ra.slice(0, n);
}

function khoangCachToiDoan(q: D, a: D, b: D): number {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(q[0] - a[0], q[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2));
  return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
}

/** Douglas–Peucker: giữ những điểm «gãy» hơn dung sai */
export function rutGonDP(p: D[], dungSai: number): D[] {
  if (p.length < 3) return p.slice();
  let xa = 0; let iXa = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = khoangCachToiDoan(p[i], p[0], p[p.length - 1]);
    if (d > xa) { xa = d; iXa = i; }
  }
  if (xa <= dungSai) return [p[0], p[p.length - 1]];
  const trai = rutGonDP(p.slice(0, iXa + 1), dungSai);
  const phai = rutGonDP(p.slice(iXa), dungSai);
  return [...trai.slice(0, -1), ...phai];
}

function dungDoan(a: D, b: D, ra: number[]) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(d / BUOC_DUNG));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ra.push(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), 0.5);
  }
}

function dungDaGiac(dinh: D[]): number[] {
  const ra: number[] = [];
  for (let i = 0; i < dinh.length; i++) dungDoan(dinh[i], dinh[(i + 1) % dinh.length], ra);
  return ra;
}

function dungElip(cx: number, cy: number, rx: number, ry: number): number[] {
  const ra: number[] = [];
  const n = Math.max(24, Math.ceil((Math.PI * (rx + ry)) / BUOC_DUNG));
  for (let i = 0; i <= n; i++) {
    const g = (i / n) * Math.PI * 2;
    ra.push(cx + rx * Math.cos(g), cy + ry * Math.sin(g), 0.5);
  }
  return ra;
}

/**
 * Nhận hình từ dãy điểm phẳng [x, y, p, …]. Trả null nếu không giống hình nào
 * đủ rõ — thà giữ nét tay còn hơn biến chữ ký thành hình tròn.
 */
export function nhanHinh(diemPhang: number[]): HinhNhan | null {
  const goc = taiXY(diemPhang);
  if (goc.length < 5) return null;
  const L = chieuDai(goc);
  if (L < 40) return null;
  const p = layMauLai(goc, SO_MAU);
  const dau = p[0]; const cuoi = p[p.length - 1];
  const dauCuoi = Math.hypot(cuoi[0] - dau[0], cuoi[1] - dau[1]);

  // ---- đường thẳng ----
  if (dauCuoi > 0.8 * L) {
    let lech = 0;
    for (const q of p) lech = Math.max(lech, khoangCachToiDoan(q, dau, cuoi));
    if (lech < 0.06 * L) {
      // Gần ngang / gần dọc (±7°) thì ép thẳng hàng — tay run vài độ không ai cố ý
      let [x2, y2] = cuoi;
      const goc = Math.abs(Math.atan2(y2 - dau[1], x2 - dau[0]) * 180 / Math.PI);
      if (goc < 7 || goc > 173) y2 = dau[1];
      else if (Math.abs(goc - 90) < 7) x2 = dau[0];
      const ra: number[] = [];
      dungDoan(dau, [x2, y2], ra);
      return { loai: 'DUONG', diem: ra };
    }
    return null;
  }

  // ---- nét khép kín ----
  if (dauCuoi > 0.25 * L) return null;
  const xs = p.map((q) => q[0]); const ys = p.map((q) => q[1]);
  const x1 = Math.min(...xs); const x2 = Math.max(...xs); const y1 = Math.min(...ys); const y2 = Math.max(...ys);
  const w = x2 - x1; const h = y2 - y1;
  if (w < 12 || h < 12) return null;
  const cx = (x1 + x2) / 2; const cy = (y1 + y2) / 2;

  // Đếm góc: khép vòng bằng cách xoay điểm đầu về góc xa tâm nhất để DP không cắt đúng chỗ gãy
  let iXa = 0; let dXa = -1;
  p.forEach((q, i) => { const d = Math.hypot(q[0] - cx, q[1] - cy); if (d > dXa) { dXa = d; iXa = i; } });
  const vong = [...p.slice(iXa), ...p.slice(0, iXa), p[iXa]];
  const dinh = rutGonDP(vong, 0.035 * L).slice(0, -1);
  // Gộp đỉnh quá sát nhau (bút rung ở góc sinh hai đỉnh cách vài px)
  const dinhGon: D[] = [];
  for (const d of dinh) {
    const truoc = dinhGon[dinhGon.length - 1];
    if (!truoc || Math.hypot(d[0] - truoc[0], d[1] - truoc[1]) > 0.08 * L) dinhGon.push(d);
  }
  if (dinhGon.length > 1) {
    const a = dinhGon[0]; const b = dinhGon[dinhGon.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 0.08 * L) dinhGon.pop();
  }

  if (dinhGon.length === 3) return { loai: 'TAM_GIAC', diem: dungDaGiac(dinhGon) };
  if (dinhGon.length === 4) {
    // Cạnh nào cũng gần ngang/dọc → ép vào khung bao cho vuông vức
    const gocCanh = dinhGon.map((d, i) => {
      const e = dinhGon[(i + 1) % 4];
      const g = Math.abs(Math.atan2(e[1] - d[1], e[0] - d[0]) * 180 / Math.PI) % 90;
      return Math.min(g, 90 - g);
    });
    if (gocCanh.every((g) => g < 12)) {
      return { loai: 'CHU_NHAT', diem: dungDaGiac([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]) };
    }
    return { loai: 'TU_GIAC', diem: dungDaGiac(dinhGon) };
  }

  // Elip: bán kính chuẩn hoá theo khung bao phải đều
  const rx = w / 2; const ry = h / 2;
  const r = p.map((q) => Math.hypot((q[0] - cx) / rx, (q[1] - cy) / ry));
  const tb = r.reduce((s, v) => s + v, 0) / r.length;
  const lech = Math.sqrt(r.reduce((s, v) => s + (v - tb) ** 2, 0) / r.length) / tb;
  if (dinhGon.length >= 5 && lech < 0.14) {
    const tron = Math.abs(rx - ry) < 0.15 * Math.max(rx, ry);
    const rr = (rx + ry) / 2;
    return tron ? { loai: 'TRON', diem: dungElip(cx, cy, rr, rr) } : { loai: 'ELIP', diem: dungElip(cx, cy, rx, ry) };
  }
  return null;
}

/** Tên tiếng Việt để báo cho người vẽ */
export const TEN_HINH: Record<LoaiHinh, string> = {
  DUONG: 'đường thẳng', TRON: 'hình tròn', ELIP: 'hình elip', CHU_NHAT: 'hình chữ nhật', TU_GIAC: 'tứ giác', TAM_GIAC: 'tam giác',
};
