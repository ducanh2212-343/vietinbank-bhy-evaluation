import { describe, it, expect } from 'vitest';
import {
  calculateRewardValue, getMilestoneInfo, getRewardBreakdown, nhacMocQuaKeTiep,
} from '../starMath';

// Bảng kỳ vọng tính tay theo đúng công thức bản deploy:
//   100k×sao + ⌊sao/3⌋×300k + (sao>=6 ? 500k : 0) + mốc cao nhất (>=8)
const EXPECTED_TOTALS: Array<[stars: number, total: number]> = [
  [1, 100_000],
  [2, 200_000],
  [3, 600_000],          // 300k + 1×300k
  [4, 700_000],
  [5, 800_000],
  [6, 1_700_000],        // 600k + 2×300k + 500k
  [7, 1_800_000],
  [8, 3_400_000],        // 800k + 2×300k + 500k + 1.5M
  [9, 2_300_000 + 1_500_000], // 900k + 3×300k + 500k + 1.5M = 3.8M
  [10, 3_900_000],
  [11, 4_000_000],
  [12, 5_400_000],       // 1.2M + 4×300k + 500k + 2.5M
  [13, 5_500_000],
  [14, 5_600_000],
  [15, 15_500_000],      // 1.5M + 5×300k + 500k + 12M
  [16, 15_600_000],
  [17, 15_700_000],
  [18, 19_100_000],      // 1.8M + 6×300k + 500k + 15M
  [19, 19_200_000],
  [20, 49_300_000],      // 2M + 6×300k + 500k + 45M
];

describe('getRewardBreakdown — quy đổi thưởng 1→20 sao (khớp bản deploy)', () => {
  it.each(EXPECTED_TOTALS)('%i sao → %i đ', (stars, total) => {
    expect(getRewardBreakdown(stars).totalValue).toBe(total);
    expect(calculateRewardValue(stars)).toBe(total);
  });

  it('dưới 6 sao chưa có mốc 500k, dưới 8 sao chưa có mốc cao cấp', () => {
    const b5 = getRewardBreakdown(5);
    expect(b5.sixStarValue).toBe(0);
    expect(b5.highTierValue).toBe(0);
    const b7 = getRewardBreakdown(7);
    expect(b7.sixStarValue).toBe(500_000);
    expect(b7.highTierValue).toBe(0);
  });

  it('chỉ tính MỘT mốc cao nhất, không cộng dồn các mốc cao cấp', () => {
    // 20 sao: chỉ mốc 20 (45M), không cộng thêm mốc 8/12/15/18
    expect(getRewardBreakdown(20).highTierValue).toBe(45_000_000);
    expect(getRewardBreakdown(19).highTierValue).toBe(15_000_000);
    expect(getRewardBreakdown(14).highTierValue).toBe(2_500_000);
  });
});

describe('getMilestoneInfo — mốc đã đạt / mốc kế tiếp', () => {
  it('7 sao: đã đạt mốc 6, mốc kế tiếp là 8', () => {
    const m = getMilestoneInfo(7);
    expect(m.achievedTier?.stars).toBe(6);
    expect(m.nextTier?.stars).toBe(8);
    expect(m.estimatedValue).toBe(1_800_000);
  });

  it('0 sao: chưa đạt mốc nào, mốc kế tiếp là 1', () => {
    const m = getMilestoneInfo(0);
    expect(m.achievedTier).toBeNull();
    expect(m.nextTier?.stars).toBe(1);
  });

  it('trên 20 sao: đạt mốc cao nhất, không còn mốc kế tiếp', () => {
    const m = getMilestoneInfo(25);
    expect(m.achievedTier?.stars).toBe(20);
    expect(m.nextTier).toBeNull();
  });
});

describe('nhacMocQuaKeTiep — treo mốc quà gần nhất để kích thích nhận sao', () => {
  it('chưa có sao nào thì mốc kế tiếp là mốc 1 sao', () => {
    const n = nhacMocQuaKeTiep(0);
    expect(n?.conThieu).toBe(1);
    expect(n?.moc.stars).toBe(1);
  });

  it('đếm đúng số sao còn thiếu ở từng mốc trong văn bản', () => {
    expect(nhacMocQuaKeTiep(1)?.conThieu).toBe(2);   // 1 → 3
    expect(nhacMocQuaKeTiep(5)?.conThieu).toBe(1);   // 5 → 6
    expect(nhacMocQuaKeTiep(6)?.conThieu).toBe(2);   // 6 → 8
    expect(nhacMocQuaKeTiep(13)?.conThieu).toBe(2);  // 13 → 15
    expect(nhacMocQuaKeTiep(19)?.conThieu).toBe(1);  // 19 → 20
  });

  it('câu nhắc nêu đủ số sao còn thiếu, mốc, và tên quà', () => {
    expect(nhacMocQuaKeTiep(6)?.cau)
      .toBe('Còn 2 Sao nữa tới mốc 8 Sao — Loa / Tai nghe Bluetooth chính hãng');
  });

  it('chạm mốc cao nhất thì KHÔNG treo mốc nữa — treo thêm là chế nhạo', () => {
    expect(nhacMocQuaKeTiep(20)).toBeNull();
    expect(nhacMocQuaKeTiep(25)).toBeNull();
  });
});
