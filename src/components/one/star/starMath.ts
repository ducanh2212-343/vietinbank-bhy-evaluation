// Công thức quy đổi thưởng "Sao Xứng Đáng" — port NGUYÊN VẸN từ bản triển khai thật
// (StarWorthy2026.tsx trên hệ thống cũ, hàm getRewardBreakdown / getMilestoneInfo).
//
// LƯU Ý QUAN TRỌNG: công thức này CỐ TÌNH giữ đúng theo app đã triển khai, kể cả khi
// văn bản quy chế ghi rằng từ mốc 8 Sao trở lên khi đổi quà sẽ "đóng dấu ĐÃ ĐỔI QUÀ"
// và DỪNG tích lũy. App thật vẫn cộng dồn đầy đủ (gốc + mốc 3 sao + mốc 6 sao + mốc
// cao nhất >= 8 sao) — chủ chương trình sẽ quyết định sau; không tự ý "sửa" ở đây.

export interface RewardBreakdown {
  baseValue: number;
  threeStarCount: number;
  threeStarValue: number;
  sixStarValue: number;
  highTierName: string;
  highTierValue: number;
  totalValue: number;
}

export interface StarRewardTier {
  stars: number;
  name: string;
  maxVal: string;
  isHighTier?: boolean;
}

// Danh mục mốc quà 2026 (bản thuần dữ liệu của REWARDS_2026 trong app gốc, bỏ icon/màu)
export const STAR_REWARD_TIERS: StarRewardTier[] = [
  { stars: 1, name: 'Voucher Cafe / Ăn uống / Tiền mặt', maxVal: '100,000 đ' },
  { stars: 3, name: 'Giftset VietinBank (Logo Chi nhánh)', maxVal: '300,000 đ' },
  { stars: 6, name: 'Voucher Siêu thị / Quà tặng tiện ích', maxVal: '500,000 đ' },
  { stars: 8, name: 'Loa / Tai nghe Bluetooth chính hãng', maxVal: '1,500,000 đ', isHighTier: true },
  { stars: 12, name: 'Túi xách / Giày công sở cao cấp', maxVal: '2,500,000 đ', isHighTier: true },
  { stars: 15, name: 'Apple Watch Series đời mới nhất', maxVal: '12,000,000 đ', isHighTier: true },
  { stars: 18, name: 'Voucher Du lịch (Vé máy bay + Khách sạn)', maxVal: '15,000,000 đ', isHighTier: true },
  { stars: 20, name: 'iPhone 18 Pro Max mới nhất', maxVal: '45,000,000 đ', isHighTier: true },
];

/**
 * Quy đổi tổng số sao tích lũy ra giá trị thưởng:
 *   100.000đ × sao
 * + ⌊sao/3⌋ × 300.000đ            (mỗi mốc 3 sao 1 giftset)
 * + 500.000đ nếu sao >= 6         (mốc 6 sao, tính 1 lần)
 * + mốc quà cao nhất đạt được với sao >= 8:
 *     8 → 1.500.000đ | 12 → 2.500.000đ | 15 → 12.000.000đ | 18 → 15.000.000đ | 20 → 45.000.000đ
 */
export const getRewardBreakdown = (stars: number): RewardBreakdown => {
  const baseValue = stars * 100000;

  const threeStarCount = Math.floor(stars / 3);
  const threeStarValue = threeStarCount * 300000;

  const sixStarValue = stars >= 6 ? 500000 : 0;

  let highTierName = '';
  let highTierValue = 0;
  if (stars >= 20) {
    highTierName = 'Mốc 20 Sao (iPhone 18 Pro Max)';
    highTierValue = 45000000;
  } else if (stars >= 18) {
    highTierName = 'Mốc 18 Sao (Voucher Du lịch)';
    highTierValue = 15000000;
  } else if (stars >= 15) {
    highTierName = 'Mốc 15 Sao (Apple Watch)';
    highTierValue = 12000000;
  } else if (stars >= 12) {
    highTierName = 'Mốc 12 Sao (Túi xách/Giày cao cấp)';
    highTierValue = 2500000;
  } else if (stars >= 8) {
    highTierName = 'Mốc 8 Sao (Loa/Tai nghe Bluetooth)';
    highTierValue = 1500000;
  }

  return {
    baseValue,
    threeStarCount,
    threeStarValue,
    sixStarValue,
    highTierName,
    highTierValue,
    totalValue: baseValue + threeStarValue + sixStarValue + highTierValue,
  };
};

export const calculateRewardValue = (stars: number): number =>
  getRewardBreakdown(stars).totalValue;

export interface MilestoneInfo {
  achievedTier: StarRewardTier | null;
  nextTier: StarRewardTier | null;
  estimatedValue: number;
}

/** Mốc quà đã đạt / mốc kế tiếp + giá trị thưởng ước tính (port nguyên từ app gốc) */
export const getMilestoneInfo = (totalStars: number): MilestoneInfo => {
  let achievedTier: StarRewardTier | null = null;
  let nextTier: StarRewardTier | null = null;

  for (let i = 0; i < STAR_REWARD_TIERS.length; i++) {
    if (totalStars >= STAR_REWARD_TIERS[i].stars) {
      achievedTier = STAR_REWARD_TIERS[i];
    } else {
      nextTier = STAR_REWARD_TIERS[i];
      break;
    }
  }

  const estimatedValue = calculateRewardValue(totalStars);

  return { achievedTier, nextTier, estimatedValue };
};

/** Định dạng tiền VND theo locale vi-VN, ví dụ 3.400.000 ₫ */
export const formatVnd = (n: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
