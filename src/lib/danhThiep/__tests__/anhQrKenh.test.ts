/**
 * Khung cắt ảnh mã QR: phần dễ sai nhất là khi mã nằm sát mép ảnh (mã QR
 * KakaoTalk thường chạm mép dưới ảnh chụp màn hình) — cắt tràn ra ngoài thì
 * canvas trả về vùng trong suốt và mã hỏng.
 */
import { describe, expect, it } from 'vitest';
import { hopVuongQuanhMa } from '../anhQrKenh';

const goc = (x0: number, y0: number, canh: number) => [
  { x: x0, y: y0 },
  { x: x0 + canh, y: y0 },
  { x: x0 + canh, y: y0 + canh },
  { x: x0, y: y0 + canh },
];

describe('hopVuongQuanhMa', () => {
  it('nới lề quanh mã và giữ tâm mã', () => {
    const h = hopVuongQuanhMa(goc(400, 800, 200), 1000, 2000);
    expect(h.canh).toBeCloseTo(240, 5);      // 200 + 2 × 10%
    expect(h.x + h.canh / 2).toBeCloseTo(500, 5);
    expect(h.y + h.canh / 2).toBeCloseTo(900, 5);
  });

  it('mã sát mép trái thì đẩy khung vào trong, không ra số âm', () => {
    const h = hopVuongQuanhMa(goc(0, 100, 200), 1000, 1000);
    expect(h.x).toBe(0);
    expect(h.y).toBeGreaterThanOrEqual(0);
  });

  it('mã sát mép dưới thì khung vẫn nằm trọn trong ảnh', () => {
    const h = hopVuongQuanhMa(goc(300, 780, 200), 1000, 1000);
    expect(h.y + h.canh).toBeLessThanOrEqual(1000);
    expect(h.x + h.canh).toBeLessThanOrEqual(1000);
  });

  it('mã to gần bằng ảnh thì khung không vượt cạnh ngắn', () => {
    const h = hopVuongQuanhMa(goc(10, 10, 960), 1000, 1000);
    expect(h.canh).toBeLessThanOrEqual(1000);
    expect(h.x).toBeGreaterThanOrEqual(0);
    expect(h.y).toBeGreaterThanOrEqual(0);
  });

  it('ảnh dọc kiểu chụp màn hình WeChat: khung vuông theo cạnh ngắn', () => {
    const h = hopVuongQuanhMa(goc(200, 1200, 700), 1080, 2400);
    expect(h.canh).toBeLessThanOrEqual(1080);
    expect(h.x + h.canh).toBeLessThanOrEqual(1080);
    expect(h.y + h.canh).toBeLessThanOrEqual(2400);
  });
});
