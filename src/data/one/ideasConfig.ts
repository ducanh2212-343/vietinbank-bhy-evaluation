// Cấu hình BHY Ideas — port từ DEFAULT_IDEA_FIELDS của bản deploy (UniquePrograms.tsx:224-246).
// Bộ trường tĩnh (bản gốc cho admin sửa cấu hình động — đơn giản hóa có chủ đích,
// field lạ của dữ liệu cũ nằm trong custom_values).

// Danh sách 11 đơn vị dùng cho Ideas/Credit 360 (chuẩn hóa một hệ tên duy nhất —
// bản gốc tồn tại song song 'Phòng bán lẻ'/'Phòng KHBL', 'Ban giám đốc'/'Ban Giám Đốc')
export const IDEA_DEPARTMENTS = [
  'Ban Giám Đốc',
  'Phòng KHDN',
  'Phòng KHBL',
  'Phòng DVKH',
  'Phòng TCTH',
  'Phòng HTTD',
  'PGD Khoái Châu',
  'PGD Văn Lâm',
  'PGD Văn Giang',
  'PGD Ân Thi',
  'PGD Yên Mỹ',
] as const;

export const IDEA_LEVELS = ['Nội bộ CN', 'Đề xuất TSC'] as const;
export const IDEA_APPLICABILITIES = ['Cấp Phòng', 'Cấp Chi nhánh', 'Toàn hàng'] as const;
export const IDEA_DEV_LEVELS = ['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa'] as const;

export type IdeaLevel = (typeof IDEA_LEVELS)[number];
export type IdeaApplicability = (typeof IDEA_APPLICABILITIES)[number];
export type IdeaDevLevel = (typeof IDEA_DEV_LEVELS)[number];

// Đơn giá thưởng theo cấp độ (đúng bản deploy: Lan tỏa dự toán theo cận trên 3M)
export const IDEA_TIER_REWARDS: Record<IdeaDevLevel, number> = {
  'Ươm mầm': 100_000,
  'Bén rễ': 300_000,
  'Vươn cành': 1_000_000,
  'Lan tỏa': 3_000_000,
};

export const IDEA_DEV_LEVEL_EMOJI: Record<IdeaDevLevel, string> = {
  'Ươm mầm': '🌱',
  'Bén rễ': '🌿',
  'Vươn cành': '🌳',
  'Lan tỏa': '⭐',
};
