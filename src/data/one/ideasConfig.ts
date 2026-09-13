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

export type IdeaDepartment = (typeof IDEA_DEPARTMENTS)[number];

// Bảng departments (hồ sơ nhân sự) dùng tên đầy đủ, Ideas dùng tên rút gọn.
// Dùng để suy ra Phòng/Ban của phiếu từ hồ sơ cán bộ, khỏi bắt cán bộ chọn lại.
// Đối xứng với hàm SQL public.bhy_phong_ideas_sang_ho_so (migration 20260818090000).
export const HO_SO_PHONG_SANG_IDEAS: Record<string, IdeaDepartment> = {
  'Ban Giám đốc': 'Ban Giám Đốc',
  'Phòng KHDN': 'Phòng KHDN',
  'Phòng Bán lẻ': 'Phòng KHBL',
  'Phòng Dịch vụ khách hàng': 'Phòng DVKH',
  'Phòng Tổ chức Tổng hợp': 'Phòng TCTH',
  'Phòng Hỗ trợ tín dụng': 'Phòng HTTD',
  'Phòng giao dịch Khoái Châu': 'PGD Khoái Châu',
  'Phòng giao dịch Văn Lâm': 'PGD Văn Lâm',
  'Phòng giao dịch Văn Giang': 'PGD Văn Giang',
  'Phòng giao dịch Ân Thi': 'PGD Ân Thi',
  'Phòng giao dịch Yên Mỹ': 'PGD Yên Mỹ',
  // Danh bạ đổi tên Phòng giao dịch Yên Mỹ → Phòng giao dịch Ocean City
  // (08/2026). Nhãn Ideas lưu trong dữ liệu vẫn là 'PGD Yên Mỹ'; đổi nhãn
  // hiển thị Ideas là việc riêng vì đụng phiếu đã lưu + cấu hình site.
  'Phòng giao dịch Ocean City': 'PGD Yên Mỹ',
};

export const IDEA_LEVELS = ['Nội bộ CN', 'Đề xuất TSC'] as const;
export const IDEA_APPLICABILITIES = ['Cấp Phòng', 'Cấp Chi nhánh', 'Toàn hàng'] as const;
export const IDEA_DEV_LEVELS = ['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa'] as const;

export type IdeaLevel = (typeof IDEA_LEVELS)[number];
export type IdeaApplicability = (typeof IDEA_APPLICABILITIES)[number];
export type IdeaDevLevel = (typeof IDEA_DEV_LEVELS)[number];

/**
 * NHÓM LĨNH VỰC của ý tưởng (chốt vận hành 08/2026).
 *
 * Khác ba trục phân loại đã có, và khác ở chỗ nào thì cần nói rõ kẻo dùng lẫn:
 *   - «Cấp đề xuất» (Nội bộ CN / Đề xuất TSC) — nơi xét duyệt
 *   - «Phạm vi áp dụng» (Phòng / Chi nhánh / Toàn hàng) — ảnh hưởng tới đâu
 *   - «Cấp độ phát triển» (Ươm mầm → Lan tỏa) — đi được bao xa
 *   - «Nhóm lĩnh vực» (dưới đây) — SÁNG TẠO VỀ CHUYỆN GÌ
 *
 * Trục thứ tư này trả lời câu hỏi mà ba trục kia không trả lời được: Chi nhánh
 * đang sáng tạo mạnh ở mảng nào, mảng nào bỏ trống để phát động tiếp.
 *
 * Sáu nhóm bám theo việc thật của một chi nhánh ngân hàng, cộng «Khác» để không
 * ép cán bộ chọn sai khi ý tưởng nằm ngoài khung — thà có một nhóm Khác nhỏ còn
 * hơn số liệu các nhóm kia bị nhiễu.
 */
export const IDEA_LINH_VUC = [
  'Quy trình nghiệp vụ',
  'Công nghệ số & AI',
  'Trải nghiệm khách hàng',
  'Tiết giảm chi phí',
  'An toàn & tuân thủ',
  'Quản trị nội bộ',
  'Khác',
] as const;

export type IdeaLinhVuc = (typeof IDEA_LINH_VUC)[number];

/** Gợi ý để cán bộ chọn đúng nhóm ngay lần đầu, khỏi phải đoán */
export const IDEA_LINH_VUC_INFO: Record<IdeaLinhVuc, { emoji: string; goiY: string; mau: string }> = {
  'Quy trình nghiệp vụ': {
    emoji: '⚙️',
    goiY: 'Rút gọn bước, bỏ giấy tờ thừa, gộp khâu, chuẩn hóa mẫu biểu.',
    mau: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  'Công nghệ số & AI': {
    emoji: '💻',
    goiY: 'Dùng công cụ số, tự động hóa việc thủ công, khai thác dữ liệu, trợ lý AI.',
    mau: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  'Trải nghiệm khách hàng': {
    emoji: '🤝',
    goiY: 'Giảm thời gian chờ, bớt thủ tục cho khách, cải thiện cách phục vụ tại quầy.',
    mau: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  'Tiết giảm chi phí': {
    emoji: '💰',
    goiY: 'Giảm chi phí vận hành, tiết kiệm vật tư, tận dụng nguồn lực sẵn có.',
    mau: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  'An toàn & tuân thủ': {
    emoji: '🛡️',
    goiY: 'Ngăn sai sót, phát hiện rủi ro sớm, siết điểm hở trong tác nghiệp.',
    mau: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  'Quản trị nội bộ': {
    emoji: '🏛️',
    goiY: 'Cách điều hành, họp hành, giao việc, đào tạo và phối hợp giữa các phòng.',
    mau: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  'Khác': {
    emoji: '💡',
    goiY: 'Ý tưởng chưa thuộc nhóm nào ở trên.',
    mau: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

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
