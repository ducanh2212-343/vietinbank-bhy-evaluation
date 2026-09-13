import { describe, it, expect } from 'vitest';
import { layMauLai, nhanHinh, rutGonDP } from '../nhanHinh';

/** Sinh nét «tay run»: thêm nhiễu giả ngẫu nhiên (cố định hạt) để test lặp lại được */
function run(diem: Array<[number, number]>, bienDo: number, hat = 7): number[] {
  let s = hat;
  const ngau = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
  const ra: number[] = [];
  for (const [x, y] of diem) ra.push(x + ngau() * bienDo * 2, y + ngau() * bienDo * 2, 0.5);
  return ra;
}
function vong(cx: number, cy: number, rx: number, ry: number, n = 60, du = 0.95): Array<[number, number]> {
  const ra: Array<[number, number]> = [];
  for (let i = 0; i <= n * du; i++) { const g = (i / n) * Math.PI * 2; ra.push([cx + rx * Math.cos(g), cy + ry * Math.sin(g)]); }
  return ra;
}
function daGiac(dinh: Array<[number, number]>, moiCanh = 15, hoDau = 3): Array<[number, number]> {
  const ra: Array<[number, number]> = [];
  for (let i = 0; i < dinh.length; i++) {
    const a = dinh[i]; const b = dinh[(i + 1) % dinh.length];
    for (let k = 0; k < moiCanh; k++) { const t = k / moiCanh; ra.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
  }
  return ra.slice(0, ra.length - hoDau);
}

describe('nhận hình từ nét vẽ tay', () => {
  it('lấy mẫu lại cho đúng số điểm, đầu cuối giữ nguyên', () => {
    const p = layMauLai([[0, 0], [100, 0], [100, 100]], 16);
    expect(p).toHaveLength(16);
    expect(p[0]).toEqual([0, 0]);
    expect(p[15][0]).toBeCloseTo(100); expect(p[15][1]).toBeCloseTo(100);
  });
  it('Douglas–Peucker giữ đúng góc gãy', () => {
    const p: Array<[number, number]> = [[0, 0], [50, 1], [100, 0], [100, 50], [101, 100]];
    expect(rutGonDP(p, 3)).toEqual([[0, 0], [100, 0], [101, 100]]);
  });
  it('gạch run tay gần ngang → đường thẳng ngang hẳn', () => {
    const net = run(Array.from({ length: 30 }, (_, i) => [100 + i * 10, 200 + i * 0.4] as [number, number]), 3);
    const h = nhanHinh(net)!;
    expect(h.loai).toBe('DUONG');
    expect(h.diem[1]).toBeCloseTo(h.diem[h.diem.length - 2]); // y đầu = y cuối
  });
  it('vòng méo khép gần kín → hình tròn; hình dẹt → elip', () => {
    expect(nhanHinh(run(vong(300, 300, 100, 100), 6))?.loai).toBe('TRON');
    expect(nhanHinh(run(vong(300, 300, 160, 70), 5))?.loai).toBe('ELIP');
  });
  it('bốn cạnh xiêu vẹo gần trục → chữ nhật ép vào khung bao', () => {
    const h = nhanHinh(run(daGiac([[100, 100], [400, 104], [396, 300], [102, 296]]), 4))!;
    expect(h.loai).toBe('CHU_NHAT');
    const xs = h.diem.filter((_, i) => i % 3 === 0);
    expect(new Set(xs.map((x) => Math.round(x / 50))).size).toBeLessThanOrEqual(7); // chỉ hai cạnh dọc + hai cạnh ngang
  });
  it('ba cạnh → tam giác; hình thoi xoay → tứ giác (không ép về khung bao)', () => {
    expect(nhanHinh(run(daGiac([[100, 300], [400, 300], [250, 50]]), 4))?.loai).toBe('TAM_GIAC');
    expect(nhanHinh(run(daGiac([[250, 50], [450, 200], [250, 350], [50, 200]]), 3))?.loai).toBe('TU_GIAC');
  });
  it('chữ viết / nét ngoằn ngoèo không thành hình — trả null', () => {
    const song = Array.from({ length: 60 }, (_, i) => [100 + i * 6, 200 + Math.sin(i / 3) * 60] as [number, number]);
    expect(nhanHinh(run(song, 1))).toBeNull();
    expect(nhanHinh(run([[0, 0], [10, 10], [20, 0]], 0))).toBeNull(); // quá ngắn
  });
});
