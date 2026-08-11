import { describe, it, expect } from 'vitest';
import { tinhCuon, easeInOutQuad } from '../engineCuonGiay';

/**
 * Kiểm chứng hai bất biến của mô hình giấy không co giãn (đặc tả Phần 4.1):
 *   1. F + πr + L = W  — tổng chiều dài giấy không đổi
 *   2. F − L = d       — mép giấy bám đúng vị trí ngón tay
 * Sai số cho phép ~1px ở hai đầu hành trình do sàn bán kính r ≥ 0.6.
 */
describe('tinhCuon — mô hình giấy không co giãn', () => {
  const W = 500;

  it('bảo toàn chiều dài giấy và mép bám ngón tay trên toàn hành trình', () => {
    for (let d = -W; d <= W; d += 5) {
      const { r, F, arc, L } = tinhCuon(d, W);
      expect(F + arc + L).toBeGreaterThanOrEqual(W - 0.001); // L có max(0,·) nên không hụt
      expect(F + arc + L).toBeLessThanOrEqual(W + Math.PI * 0.6 + 0.001);
      // F − L = d, trừ vùng 2 đầu bị chặn sàn r
      if (Math.abs(d) < W - 3) {
        expect(Math.abs(F - L - d)).toBeLessThan(0.001);
      }
      expect(r).toBeGreaterThanOrEqual(0.6);
      expect(F).toBeGreaterThanOrEqual(0);
      expect(L).toBeGreaterThanOrEqual(0);
    }
  });

  it('hai đầu hành trình gần phẳng: cuộn thu về sát mép', () => {
    const phang = tinhCuon(W, W);
    expect(phang.F).toBeGreaterThan(W - 2);
    expect(phang.L).toBe(0);
    const lath = tinhCuon(-W, W);
    expect(lath.F).toBeLessThan(2);
    expect(lath.L).toBeGreaterThan(W - 4);
  });

  it('nếp phồng nhất ở giữa hành trình', () => {
    const giua = tinhCuon(0, W);
    const dau = tinhCuon(W * 0.9, W);
    expect(giua.r).toBeGreaterThan(dau.r);
    expect(giua.r).toBeCloseTo(W * 0.13 + 0.6, 0);
  });
});

describe('easeInOutQuad', () => {
  it('neo đúng ba mốc 0 · 0.5 · 1', () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(0.5)).toBe(0.5);
    expect(easeInOutQuad(1)).toBe(1);
  });
});
