import {
  LayoutDashboard, Users, UserPlus, Shield, Target,
  User, UsersRound, Star,
  Upload, Settings as SettingsIcon, BarChart3, Image, FileText,
  UserCheck, Sparkles, GraduationCap, ClipboardList, KeyRound, ListPlus,
  CalendarClock, Timer, MessagesSquare, Mail, ShieldAlert, Route, ArrowLeftRight, Newspaper, Flag, GitBranch,
  ListChecks, Building2, Gavel, TrendingUp, Zap, Lightbulb,
  Home, BookOpen, TreeDeciduous,
  type LucideIcon,
} from 'lucide-react';

/**
 * NGUỒN DỮ LIỆU ĐIỀU HƯỚNG DUY NHẤT của cổng BHY ONE.
 *
 * Trước đây cây menu bị nhốt trong AppSidebar.tsx còn thanh ngang /one giữ một
 * mảng riêng, nên hai nơi mô tả cùng một site theo hai cách khác nhau. Mọi bề
 * mặt điều hướng — thanh ngang, sidebar phân hệ, thanh tab điện thoại, bảng lệnh
 * ⌘K, breadcrumb — nay đều đọc từ file này.
 *
 * Quy ước "khu" (zone) quyết định bố cục, theo nguyên tắc #3 của
 * docs/so-do-site-bhy-one.md ("thanh ngang ONE là tầng 1; vào phân hệ 343 mới có
 * menu dọc riêng"):
 *   - 'portal'    → cổng ONE: chỉ thanh ngang, nội dung tràn hết bề ngang.
 *   - 'workspace' → phân hệ chuyên sâu: thanh ngang + menu dọc bên trái.
 */

export type Zone = 'portal' | 'workspace';
export type MinRole = 'manager' | 'admin';
export type Special =
  | 'submission-report'
  | 'strategic-hr'
  | 'council-member'
  | 'council-report'
  | 'council-analytics'
  | 'leadership-marks';

export interface NavLeaf {
  label: string;
  icon: LucideIcon;
  path: string;
  /** Chỉ khớp chính xác đường dẫn này (không khớp route con) */
  end?: boolean;
  minRole?: MinRole;
  special?: Special;
  /** Khách đối tác không thấy mục này (mặc định: không thấy) */
  guestVisible?: boolean;
  /** Từ khóa phụ giúp tìm thấy mục trong bảng lệnh ⌘K */
  keywords?: string[];
  /**
   * Route con không có mục menu riêng nhưng thuộc về mục này — dùng để tô sáng
   * đúng mục, dựng breadcrumb và xác định khu. So khớp theo tiền tố.
   */
  extraPaths?: string[];
  /** Ẩn khỏi menu nhưng vẫn tra cứu được (route cũ giữ cho khỏi gãy link) */
  hidden?: boolean;
  /**
   * Trang tự lo bố cục tràn viền (có dải hero, nền riêng) nên khung ứng dụng
   * KHÔNG thêm khoảng đệm. Đúng với các trang bọc trong OnePageShell.
   * Mặc định false — trang thường vẫn nhận khoảng đệm chung, kể cả route lạ.
   */
  bleed?: boolean;
}

/** Thư mục con — gom các trang cùng chủ đề, cũng là một cột của mega-menu */
export interface NavFolder {
  id: string;
  folder: string;
  icon: LucideIcon;
  items: NavLeaf[];
}

export type NavEntry = NavLeaf | NavFolder;

export interface NavSection {
  id: string;
  label: string;
  /** Nhãn ngắn cho thanh tab điện thoại (tối đa ~10 ký tự) */
  shortLabel?: string;
  icon: LucideIcon;
  /** Màu nhận diện khu */
  accent: string;
  zone: Zone;
  /** Mục cấp 1 dẫn thẳng tới một trang (không bung menu con) */
  path?: string;
  end?: boolean;
  items?: NavEntry[];
  /** Khách đối tác được thấy khu này */
  guestVisible?: boolean;
  /** Mô tả ngắn hiện trong mega-menu */
  desc?: string;
  /** Trang tự lo bố cục tràn viền — xem NavLeaf.bleed */
  bleed?: boolean;
}

export function isFolder(e: NavEntry): e is NavFolder {
  return 'items' in e;
}

/**
 * Cây điều hướng. Các trang sau CHỦ Ý không có mục menu (route vẫn sống để
 * không gãy link cũ) và được gắn vào mục cha qua `extraPaths`/`hidden`:
 * /skill-bo-sung, /thai-do-tu-duy, /ke-hoach-phat-trien, /ung-dung-ai,
 * /bieu-mau-01|02|03 — nội dung thật nằm trong Tự đánh giá.
 */
export const NAV_SECTIONS: NavSection[] = [
  // ---- Khu cổng ONE: 5 mục, thanh ngang là tầng 1 ----
  {
    id: 'one-home',
    label: 'Trang chủ',
    shortLabel: 'Trang chủ',
    icon: Home,
    accent: '#F87171',
    zone: 'portal',
    path: '/one',
    end: true,
    guestVisible: true,
    bleed: true,
    desc: 'Việc của tôi, thao tác nhanh và bản sắc Chi nhánh',
  },
  {
    id: 'one-roots',
    label: 'Nguồn cội & Bản sắc',
    shortLabel: 'Nguồn cội',
    icon: TreeDeciduous,
    accent: '#34D399',
    zone: 'portal',
    path: '/one/nguon-coi',
    guestVisible: true,
    bleed: true,
    desc: 'Cây ký ức, 6 đặc trưng riêng có, Bộ 3 Chiêu thức',
    items: [
      {
        label: 'Nguồn cội & Bản sắc',
        icon: TreeDeciduous,
        path: '/one/nguon-coi',
        guestVisible: true,
        bleed: true,
        keywords: ['cay ky uc', 'dac trung', 'chieu thuc', 'van hoa', '20 nam'],
        extraPaths: ['/one/dac-trung', '/one/chieu-thuc'],
      },
    ],
  },
  {
    id: 'one-learn',
    label: 'Học hỏi & Chia sẻ',
    shortLabel: 'Học hỏi',
    icon: BookOpen,
    accent: '#4AA3F0',
    zone: 'portal',
    guestVisible: true,
    desc: 'Kho tri thức chung và luyện nghiệp vụ bằng Quizzi',
    items: [
      // Sharing + Kho tri thức là MỘT không gian 2 tab (chung một kho dữ liệu)
      {
        label: 'Sharing & Kho tri thức',
        icon: BookOpen,
        path: '/one/hoc-hoi',
        guestVisible: true,
        bleed: true,
        keywords: ['chia se', 'kho tri thuc', 'tu lieu', 'thu vien', 'sharing'],
        extraPaths: ['/one/kho-du-lieu'],
      },
      // Quizzi có nhà duy nhất tại /quizzi (kể cả khu quản trị bên trong)
      {
        label: 'BHY Quizzi',
        icon: Zap,
        path: '/quizzi',
        keywords: ['trac nghiem', 'thi', 'cau hoi', 'chien dich quiz'],
        extraPaths: ['/quizzi/', '/quan-tri-quizzi'],
      },
    ],
  },
  {
    id: 'one-initiatives',
    label: 'Sáng kiến & Nghiệp vụ',
    shortLabel: 'Sáng kiến',
    icon: Lightbulb,
    accent: '#FB923C',
    zone: 'portal',
    desc: 'Gửi ý tưởng cải tiến và đăng ký thẩm định tín dụng 360°',
    items: [
      // Trang giới thiệu chung của khu — bản cũ có link này trên thanh ngang,
      // giữ lại để /one/sang-kien không thành trang mồ côi.
      {
        label: 'Giới thiệu Sáng kiến & Nghiệp vụ',
        icon: Lightbulb,
        path: '/one/sang-kien',
        bleed: true,
        keywords: ['gioi thieu', 'tong quan sang kien'],
      },
      {
        label: 'BHY Ideas',
        icon: Lightbulb,
        path: '/one/y-tuong',
        bleed: true,
        keywords: ['y tuong', 'sang kien', 'cai tien', 'de xuat'],
      },
      {
        label: 'BHY Credit 360',
        icon: ShieldAlert,
        path: '/one/credit-360',
        bleed: true,
        keywords: ['tin dung', 'tham dinh', 'phien hop', 'credit'],
      },
    ],
  },
  {
    id: 'one-recognition',
    label: 'Ghi nhận & Lan tỏa',
    shortLabel: 'Ghi nhận',
    icon: Star,
    accent: '#FBBF24',
    zone: 'portal',
    path: '/one/ghi-nhan',
    bleed: true,
    desc: 'Sao Xứng Đáng — mọi cán bộ ghi nhận lẫn nhau',
    items: [
      {
        label: 'Sao Xứng Đáng',
        icon: Star,
        path: '/one/ghi-nhan',
        bleed: true,
        keywords: ['sao xung dang', 'khen thuong', 'vinh danh', 'tu qua'],
      },
    ],
  },

  // ---- Khu phân hệ 343: menu dọc nhiều tầng, phân quyền riêng ----
  {
    id: 'hr-343',
    label: 'Phát triển nhân sự 343',
    shortLabel: 'Nhân sự',
    icon: UsersRound,
    accent: '#2DD4BF',
    zone: 'workspace',
    desc: 'Tự đánh giá năng lực, kế hoạch hành động và quản trị đội ngũ',
    items: [
      {
        id: 'ca-nhan-343',
        folder: 'Cá nhân',
        icon: User,
        items: [
          {
            label: 'Tổng quan',
            icon: LayoutDashboard,
            path: '/tong-quan',
            keywords: ['dashboard', 'trang chinh', 'tong hop'],
          },
          {
            label: 'Tự đánh giá',
            icon: FileText,
            path: '/tu-danh-gia',
            keywords: ['bieu mau', 'bm01', 'bm02', 'bm03', 'skill', 'nang luc', 'phieu'],
            // Ba kênh nhập cũ — giữ route, gắn vào mục Tự đánh giá
            extraPaths: ['/bieu-mau-01', '/bieu-mau-02', '/bieu-mau-03', '/skill-bo-sung', '/thai-do-tu-duy', '/ke-hoach-phat-trien', '/ung-dung-ai'],
          },
          {
            label: 'Hành động phát triển',
            icon: ClipboardList,
            path: '/hanh-dong-phat-trien',
            keywords: ['kanban', 'ke hoach hanh dong', 'viec cua toi', 'idp'],
          },
          {
            label: 'Hồ sơ cá nhân',
            icon: User,
            path: '/ho-so-ca-nhan',
            keywords: ['profile', 'thong tin ca nhan'],
            extraPaths: ['/ho-so-ca-nhan/'],
          },
          {
            // KHÔNG đặt guestVisible: khu 'Phát triển nhân sự 343' vốn đã đóng với
            // khách đối tác nên cờ ở đây không bao giờ có hiệu lực — để lại chỉ gây
            // hiểu nhầm là khách thấy được mục này. Khách đổi mật khẩu bằng nút
            // riêng trong menu tài khoản (GuestGate cho phép /doi-mat-khau).
            label: 'Đổi mật khẩu',
            icon: KeyRound,
            path: '/doi-mat-khau',
            keywords: ['mat khau', 'password', 'bao mat'],
          },
        ],
      },
      {
        id: 'hoc-tap-343',
        folder: 'Học tập',
        icon: GraduationCap,
        items: [
          { label: 'Chiến dịch học tập', icon: Flag, path: '/chien-dich-hoc-tap', keywords: ['dao tao', 'khoa hoc'] },
          { label: 'Mẹo hay', icon: Lightbulb, path: '/meo-hay', keywords: ['huong dan', 'tips', 'tinh nang'] },
          { label: 'Skill lõi theo vị trí', icon: Target, path: '/skill-loi-theo-vi-tri', keywords: ['nang luc', 'vi tri', 'chuc danh'] },
        ],
      },
      {
        id: 'quan-tri-doi-ngu',
        folder: 'Quản trị đội ngũ',
        icon: UsersRound,
        items: [
          { label: 'Đội ngũ phòng ban', icon: UsersRound, path: '/doi-ngu-phong-ban', minRole: 'manager', keywords: ['phong ban', 'team'] },
          {
            label: 'Đánh giá cán bộ',
            icon: ClipboardList,
            path: '/danh-gia-can-bo',
            minRole: 'manager',
            keywords: ['duyet phieu', 'theo doi danh gia'],
            extraPaths: ['/danh-gia/', '/chi-tiet-can-bo/'],
          },
          // Màn điều hành Kanban kế hoạch hành động quý: TP (phòng), PGĐ (khối), TCTH/BGĐ (toàn CN)
          { label: 'Quản lý hành động Kanban', icon: ListChecks, path: '/quan-ly-hanh-dong', minRole: 'manager', keywords: ['kanban', 'ke hoach quy'] },
          { label: 'Phân nhóm cán bộ', icon: Star, path: '/phan-nhom-can-bo', minRole: 'manager', keywords: ['xep nhom', 'phan loai'] },
          { label: 'Báo cáo', icon: BarChart3, path: '/bao-cao', minRole: 'manager', keywords: ['thong ke', 'bieu do'] },
          // Hiển thị theo phạm vi: GĐ/PGĐ (phòng phụ trách), lãnh đạo Phòng TCTH + admin (full chi nhánh)
          { label: 'Báo cáo nộp biểu mẫu', icon: Timer, path: '/bao-cao-nop-bieu-mau', special: 'submission-report', keywords: ['tien do nop', 'han nop'] },
          // Khung dấu ấn BGĐ giao PGĐ — công cụ của Ban Giám đốc, khác Sao Xứng Đáng (khen thưởng chung)
          { label: 'Dấu ấn BHY Mark', icon: Star, path: '/dau-an', special: 'leadership-marks', keywords: ['bhy mark', 'dau an', 'giam doc'] },
          // Hội đồng đánh giá đầu mối: thành viên HĐ chấm điểm; đầu mối + admin xem báo cáo
          { label: 'Đánh giá đầu mối', icon: Gavel, path: '/danh-gia-dau-moi', special: 'council-member', keywords: ['hoi dong', 'cham diem'] },
          { label: 'Báo cáo đầu mối', icon: BarChart3, path: '/bao-cao-dau-moi', special: 'council-report', keywords: ['hoi dong', 'ket qua'] },
          { label: 'Phân tích đầu mối', icon: TrendingUp, path: '/phan-tich-dau-moi', minRole: 'admin', special: 'council-analytics', keywords: ['hoi dong', 'phan tich'] },
        ],
      },
      {
        // Dành cho Phòng Tổ chức Tổng hợp + Ban Giám đốc (dữ liệu toàn chi nhánh)
        id: 'chien-luoc-nhan-su',
        folder: 'Chiến lược nhân sự',
        icon: Route,
        items: [
          { label: 'Bản đồ rủi ro năng lực', icon: ShieldAlert, path: '/ban-do-rui-ro-nang-luc', special: 'strategic-hr', keywords: ['heatmap', 'rui ro', 'bus factor'] },
          { label: 'Con đường sự nghiệp', icon: Route, path: '/con-duong-su-nghiep', special: 'strategic-hr', keywords: ['lo trinh', 'thang tien'] },
          { label: 'Mô phỏng điều chuyển', icon: ArrowLeftRight, path: '/mo-phong-dieu-chuyen', special: 'strategic-hr', keywords: ['luan chuyen', 'what if'] },
        ],
      },
      {
        id: 'cau-hinh-danh-gia',
        folder: 'Cấu hình đánh giá',
        icon: CalendarClock,
        items: [
          { label: 'Quản lý kỳ đánh giá', icon: CalendarClock, path: '/quan-ly-ky-danh-gia', minRole: 'admin', keywords: ['chu ky', 'quy'] },
          { label: 'Phân công người đánh giá', icon: GitBranch, path: '/phan-cong-danh-gia', minRole: 'admin' },
          { label: 'Câu hỏi 1-1 theo kỳ', icon: MessagesSquare, path: '/quan-tri-cau-hoi-1-1', minRole: 'admin' },
          { label: 'Cấu hình skill lõi', icon: Target, path: '/cau-hinh-skill-loi', minRole: 'admin' },
          { label: 'Tiêu chí level skill', icon: ListChecks, path: '/quan-tri-tieu-chi-level', minRole: 'admin' },
          { label: 'Quản trị hình ảnh skill', icon: Image, path: '/quan-tri-hinh-anh-skill', minRole: 'admin' },
          { label: 'Khóa học VietinBank', icon: GraduationCap, path: '/quan-tri-khoa-hoc-vtb', minRole: 'admin' },
          { label: 'Tổng hợp nhu cầu đào tạo', icon: GraduationCap, path: '/tong-hop-nhu-cau-dao-tao', minRole: 'admin' },
        ],
      },
      {
        id: 'noi-dung-he-thong',
        folder: 'Nội dung & Hệ thống',
        icon: Building2,
        items: [
          { label: 'Quản trị Hội đồng đầu mối', icon: Gavel, path: '/quan-tri-hoi-dong-dau-moi', minRole: 'admin' },
          { label: 'Bản tin quý', icon: Newspaper, path: '/ban-tin-quy', minRole: 'admin' },
          { label: 'Mẹo tính năng', icon: Lightbulb, path: '/quan-ly-meo-tinh-nang', minRole: 'admin' },
          { label: 'Quản trị AI & Prompt', icon: Sparkles, path: '/quan-tri-ai', minRole: 'admin' },
          { label: 'Quản trị Email', icon: Mail, path: '/quan-tri-email', minRole: 'admin' },
          { label: 'Cài đặt', icon: SettingsIcon, path: '/cai-dat', minRole: 'admin' },
        ],
      },
    ],
  },

  // ---- Quản trị người dùng CHUNG toàn cổng (nguyên lý chieuthuc3.com:
  // một danh sách cán bộ + một hệ phân quyền, mọi phân hệ dùng chung) ----
  {
    id: 'user-admin',
    label: 'Quản trị người dùng',
    shortLabel: 'Người dùng',
    icon: Shield,
    accent: '#FB7185',
    zone: 'workspace',
    desc: 'Danh mục cán bộ, phân quyền và tài khoản khách đối tác',
    items: [
      {
        id: 'danh-muc-nguoi-dung',
        folder: 'Danh mục người dùng',
        icon: Users,
        items: [
          // Cửa vào chính: xem toàn bộ cán bộ (quản lý chỉ thấy phạm vi của mình
          // theo RLS), từ đây mở hồ sơ từng người
          {
            label: 'Danh sách cán bộ',
            icon: Users,
            path: '/danh-sach-can-bo',
            minRole: 'manager',
            keywords: ['nhan su', 'ho so', 'tim can bo'],
            extraPaths: ['/sua-can-bo/'],
          },
          { label: 'Thêm cán bộ', icon: UserPlus, path: '/them-can-bo', minRole: 'admin' },
          { label: 'Nhập nhanh theo phòng', icon: ListPlus, path: '/nhap-nhanh-can-bo', minRole: 'admin' },
          { label: 'Upload danh sách CB', icon: Upload, path: '/upload-danh-sach-cb', minRole: 'admin' },
        ],
      },
      {
        id: 'to-chuc-phan-quyen',
        folder: 'Tổ chức & Phân quyền',
        icon: Shield,
        items: [
          { label: 'Phòng ban & Chức danh', icon: Building2, path: '/quan-ly-phong-ban', minRole: 'admin' },
          { label: 'Phân quyền', icon: Shield, path: '/phan-quyen', minRole: 'admin', keywords: ['vai tro', 'role'] },
          { label: 'Duyệt yêu cầu user', icon: UserCheck, path: '/duyet-yeu-cau-user', minRole: 'admin' },
          { label: 'Tài khoản khách đối tác', icon: UserCheck, path: '/quan-tri-khach', minRole: 'admin', keywords: ['guest', 'doi tac'] },
        ],
      },
    ],
  },
];

/**
 * Kết quả của các hook phân quyền, gom lại thành một đối tượng thuần để phần
 * lọc menu là hàm thuần — kiểm thử được mà không cần dựng React.
 */
export interface NavPermissions {
  isGuest: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isPgd: boolean;
  submissionReport: boolean;
  strategicHr: boolean;
  councilMember: boolean;
  councilReport: boolean;
  councilAnalytics: boolean;
  leadershipMarks: boolean;
}

/**
 * Có được thấy mục lá không.
 *
 * Giữ NGUYÊN VĂN thứ tự xét của bản cũ (AppSidebar): khách đối tác fail-closed
 * trước tiên, rồi tới `special` (theo phạm vi/hội đồng), sau cùng mới tới
 * `minRole`. Đổi thứ tự này là đổi quyền — không được phép.
 */
export function canSeeLeaf(item: NavLeaf, p: NavPermissions): boolean {
  // Khách đối tác chỉ thấy mục được mở tường minh (fail-closed)
  if (p.isGuest) return !!item.guestVisible;
  // Special (theo phạm vi/hội đồng) được ưu tiên xét trước minRole
  if (item.special === 'submission-report') return p.submissionReport;
  if (item.special === 'strategic-hr') return p.strategicHr;
  if (item.special === 'council-member') return p.councilMember;
  if (item.special === 'council-report') return p.councilReport;
  if (item.special === 'council-analytics') return p.councilAnalytics;
  if (item.special === 'leadership-marks') return p.leadershipMarks;
  if (item.minRole === 'admin' && !p.isAdmin) return false;
  if (item.minRole === 'manager' && !(p.isAdmin || p.isManager || p.isPgd)) return false;
  return true;
}

/** Lọc toàn cây theo quyền; bỏ thư mục rỗng và khu rỗng. */
export function filterSections(sections: NavSection[], p: NavPermissions): NavSection[] {
  return sections
    .map((s): NavSection | null => {
      // Khách đối tác: khu phải được mở tường minh
      if (p.isGuest && !s.guestVisible) return null;

      const entries = (s.items ?? [])
        .map((e): NavEntry | null => {
          if (isFolder(e)) {
            const items = e.items.filter((l) => canSeeLeaf(l, p));
            return items.length ? { ...e, items } : null;
          }
          return canSeeLeaf(e, p) ? e : null;
        })
        .filter((e): e is NavEntry => e !== null);

      // Khu dẫn thẳng tới một trang thì không cần mục con
      if (!s.items?.length) return s.path ? s : null;
      // Khu có mục con nhưng bị lọc sạch: CHỈ giữ lại nếu chính đường dẫn cấp khu
      // cũng nằm trong danh sách mục con — nghĩa là nó đã qua được vòng xét quyền.
      // Giữ vô điều kiện sẽ là bẫy lộ khu cho vai trò không đủ quyền khi sau này
      // có ai thêm mục con cần quyền vào một khu vốn có path.
      if (!entries.length) {
        const laTrangCongKhai = s.path && s.items.some((e) => !isFolder(e) && e.path === s.path && canSeeLeaf(e, p));
        return laTrangCongKhai ? { ...s, items: [] } : null;
      }
      return { ...s, items: entries };
    })
    .filter((s): s is NavSection => s !== null);
}

/** Mọi mục lá của một khu, đã trải phẳng qua các thư mục. */
export function leavesOf(section: NavSection): NavLeaf[] {
  if (!section.items?.length) {
    return section.path
      ? [{ label: section.label, icon: section.icon, path: section.path, end: section.end, bleed: section.bleed }]
      : [];
  }
  return section.items.flatMap((e) => (isFolder(e) ? e.items : [e]));
}

/** Mọi mục lá của cả cây, kèm khu và thư mục chứa nó — dùng cho bảng lệnh ⌘K. */
export function flattenLeaves(sections: NavSection[]): Array<{
  leaf: NavLeaf;
  section: NavSection;
  folder?: NavFolder;
}> {
  const out: Array<{ leaf: NavLeaf; section: NavSection; folder?: NavFolder }> = [];
  const seen = new Set<string>();
  for (const section of sections) {
    if (!section.items?.length) {
      if (section.path && !seen.has(section.path)) {
        seen.add(section.path);
        out.push({
          leaf: { label: section.label, icon: section.icon, path: section.path, end: section.end, keywords: section.desc ? [section.desc] : undefined },
          section,
        });
      }
      continue;
    }
    for (const e of section.items) {
      if (isFolder(e)) {
        for (const leaf of e.items) {
          if (leaf.hidden || seen.has(leaf.path)) continue;
          seen.add(leaf.path);
          out.push({ leaf, section, folder: e });
        }
      } else if (!e.hidden && !seen.has(e.path)) {
        seen.add(e.path);
        out.push({ leaf: e, section });
      }
    }
  }
  return out;
}

/** Đường dẫn hiện tại có thuộc mục lá này không (tính cả extraPaths). */
export function matchesLeaf(pathname: string, leaf: NavLeaf): boolean {
  const hit = (p: string, end?: boolean) =>
    end ? pathname === p : pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`);
  if (hit(leaf.path, leaf.end)) return true;
  return (leaf.extraPaths ?? []).some((p) => hit(p));
}

export interface NavLocation {
  section?: NavSection;
  folder?: NavFolder;
  leaf?: NavLeaf;
  zone: Zone;
}

/**
 * Tra ngược đường dẫn ra vị trí trong cây: dùng cho breadcrumb, tô sáng mục
 * đang xem, và quyết định có hiện menu dọc hay không.
 *
 * Chọn mục khớp DÀI NHẤT để '/one/nguon-coi' không bị '/one' giành mất — lỗi
 * làm hai mục cùng sáng ở bản cũ.
 */
export function resolveLocation(pathname: string, sections: NavSection[] = NAV_SECTIONS): NavLocation {
  let best: NavLocation | null = null;
  let bestLen = -1;

  const consider = (section: NavSection, leaf: NavLeaf, folder?: NavFolder) => {
    if (!matchesLeaf(pathname, leaf)) return;
    // Độ dài đường dẫn khớp quyết định độ cụ thể
    const len = Math.max(
      leaf.path.length,
      ...(leaf.extraPaths ?? []).filter((p) => pathname.startsWith(p)).map((p) => p.length),
    );
    const laMucThat = !!folder || (section.items ?? []).some((e) => !isFolder(e) && e.path === leaf.path);
    if (len > bestLen || (len === bestLen && laMucThat)) {
      bestLen = len;
      best = { section, folder, leaf, zone: section.zone };
    }
  };

  for (const section of sections) {
    if (section.path) {
      consider(section, { label: section.label, icon: section.icon, path: section.path, end: section.end, bleed: section.bleed });
    }
    for (const e of section.items ?? []) {
      if (isFolder(e)) e.items.forEach((l) => consider(section, l, e));
      else consider(section, e);
    }
  }

  // Không khớp mục nào (VD /404): coi như khu cổng để không hiện menu dọc lạc lõng
  return best ?? { zone: 'portal' };
}
