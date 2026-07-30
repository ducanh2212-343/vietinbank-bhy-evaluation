export type ProgramCategory = 
  | 'sharing' 
  | 'quizzi' 
  | 'ideas' 
  | 'credit360' 
  | 'connect' 
  | 'move1' 
  | 'move2' 
  | 'move3'
  | 'sao_xung_dang'
  | 'celebration20'
  | 'cs';

export const CATEGORY_NAMES: Record<ProgramCategory, string> = {
  sharing: 'Bắc Hưng Yên Sharing',
  quizzi: 'Bắc Hưng Yên Quizzi',
  ideas: 'Bắc Hưng Yên Ideas',
  credit360: 'Bắc Hưng Yên Credit 360',
  connect: 'Bắc Hưng Yên Connect & Thư viện',
  move1: 'Chiêu thức 1 - Năng lượng ngày mới',
  move2: 'Chiêu thức 2 - Lập KHHĐ 5W2H',
  move3: 'Chiêu thức 3 - Phát triển nhân sự',
  sao_xung_dang: 'Chương trình Sao xứng đáng',
  celebration20: 'Kỷ niệm 20 Năm VietinBank BHY',
  cs: 'Chuyển Đổi số',
};

export type Department =
  | 'Ban Giám Đốc'
  | 'Phòng TCTH'
  | 'Phòng KHDN'
  | 'Phòng KHBL'
  | 'Phòng HTTD'
  | 'Phòng DVKH'
  | 'PGD Văn Giang'
  | 'PGD Văn Lâm'
  | 'PGD Yên Mỹ'
  | 'PGD Ân Thi'
  | 'PGD Khoái Châu';

// 11 đơn vị — 'Ban Giám Đốc' đứng đầu để khớp thứ tự IDEA_DEPARTMENTS
export const DEPARTMENTS: Department[] = [
  'Ban Giám Đốc',
  'Phòng TCTH', 'Phòng KHDN', 'Phòng KHBL', 'Phòng HTTD', 'Phòng DVKH',
  'PGD Văn Giang', 'PGD Văn Lâm', 'PGD Yên Mỹ', 'PGD Ân Thi', 'PGD Khoái Châu'
];

// 3 trường thông tin bổ sung của tư liệu Kho Dữ Liệu (lưu vào custom_values jsonb)
export interface UploadCustomField {
  id: string;
  label: string;
  type: 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
}

export const UPLOAD_CUSTOM_FIELDS: UploadCustomField[] = [
  { id: 'details', label: 'Chi tiết tài liệu / Hướng dẫn áp dụng', type: 'textarea', placeholder: 'Nhập nội dung chi tiết hoặc hướng dẫn sử dụng tài liệu...' },
  { id: 'benefits', label: 'Giá trị / Hiệu quả mang lại', type: 'textarea', placeholder: 'Nêu lợi ích hoặc kết quả khi áp dụng tài liệu này...' },
  { id: 'scope', label: 'Phạm vi áp dụng', type: 'select', options: ['Toàn chi nhánh', 'Phòng ban chuyên môn', 'Phòng giao dịch'] },
];

export interface UploadedItem {
  id: string;
  title: string;
  category: ProgramCategory;
  author: string;
  department: Department;
  date: string;
  imageUrl?: string;
  /** Toàn bộ ảnh của tư liệu (signed URL khi đọc, dataURL khi đăng mới) */
  imageUrls?: string[];
  /** Giá trị 3 trường bổ sung (details/benefits/scope) */
  customValues?: Record<string, string> | null;
  summary: string;
  content?: string;
  tags: string[];
  likes: number;
  isFeatured?: boolean;
  /** Đã chia sẻ cho khách đối tác (guest) xem */
  isShared?: boolean;
}

export interface IdeaItem {
  id: string;
  code: string;
  title: string;
  author: string;
  department: Department;
  tier: 'ươm_mầm' | 'bén_rễ' | 'vươn_cành' | 'lan_tỏa';
  rewardAmount: number;
  smpStream: 'chi_nhánh' | 'trụ_sở_chính';
  submittedDate: string;
  status: 'Đang lựa chọn' | 'Đang thử nghiệm' | 'Đã nghiệm thu' | 'Đã nhân rộng';
  avgScore?: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  category: string;
  explanation: string;
  sourceRef: string;
}

export type StarType = 'sao_băng' | 'sao_mai' | 'sao_hôm' | 'sao_khuê';

export interface StarProfile {
  type: StarType;
  name: string;
  badge: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  managementMetaphor: string;
  traits: string;
  strategy: string;
}
