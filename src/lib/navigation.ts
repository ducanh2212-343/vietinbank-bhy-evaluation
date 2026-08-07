import {
  LayoutDashboard, Users, UserPlus, Shield, Target,
  User, UsersRound, Star,
  Upload, Settings as SettingsIcon, BarChart3, Image, FileText,
  UserCheck, Sparkles, GraduationCap, ClipboardList, KeyRound, ListPlus,
  CalendarClock, Timer, MessagesSquare, Mail, ShieldAlert, Route, ArrowLeftRight, Newspaper, Flag, GitBranch,
  ListChecks, Building2, Gavel, TrendingUp, Zap, Lightbulb,
  Home, BookOpen, BookMarked, Compass, Layers, Share2, CalendarDays, NotebookPen, Sprout,
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
  /**
   * Thứ tự ưu tiên trên thanh tab dưới đáy điện thoại (nhỏ hơn = đứng trước).
   * Thanh chỉ đủ chỗ cho 4 mục, phần còn lại nằm trong nút «Thêm», nên thứ tự
   * này quyết định khu nào được một chạm. Không đặt thì khu luôn nằm trong «Thêm».
   */
  mobileOrder?: number;
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
  // ---- Khu cổng ONE: thanh ngang là tầng 1 ----
  // Trang chủ đã GỘP phần "Nguồn cội & Bản sắc" vào (chốt 08/2026): cổng chỉ còn
  // một cửa vào duy nhất, phần bản sắc nằm ngay dưới khối việc của tôi.
  {
    id: 'one-home',
    mobileOrder: 1,
    label: 'Trang chủ',
    shortLabel: 'Trang chủ',
    icon: Home,
    accent: '#F87171',
    zone: 'portal',
    path: '/one',
    end: true,
    guestVisible: true,
    bleed: true,
    desc: 'Việc của tôi, bản sắc 20 năm và giới thiệu hệ sinh thái Bắc Hưng Yên Ways',
    items: [
      {
        label: 'Trang chủ ONE',
        icon: Home,
        path: '/one',
        end: true,
        guestVisible: true,
        bleed: true,
        keywords: ['trang chu', 'cay ky uc', 'nguon coi', 'ban sac', 'van hoa', '20 nam', 'viec cua toi'],
        // Nguồn cội & Bản sắc đã gộp vào trang chủ — giữ link cũ khỏi gãy
        extraPaths: ['/one/nguon-coi', '/one/dac-trung', '/one/chieu-thuc'],
      },
      {
        // Dải tin trượt ngang nằm trên Trang chủ; đây là nơi đọc hết dòng tin.
        // Khách đối tác vào được nhưng RLS chỉ trả tin đã mở cho khách.
        label: 'Tin tức nội bộ',
        icon: Newspaper,
        path: '/one/tin-tuc',
        guestVisible: true,
        bleed: true,
        keywords: ['tin tuc', 'ban tin', 'dong chia se', 'thong bao', 'news'],
      },
    ],
  },
  {
    // Cây Ký Ức — kỷ yếu số 20 năm, là TAB RIÊNG chứ không phải mục con của
    // Trang chủ: đây là ấn phẩm cả Chi nhánh cùng xem trong dịp kỷ niệm, nằm
    // trong menu xổ xuống thì nhìn vào thanh điều hướng không ai thấy.
    // Nội bộ cán bộ (ảnh tập thể, lưu bút) — không mở cho khách đối tác.
    id: 'cay-ky-uc',
    label: 'Cây Ký Ức',
    shortLabel: 'Cây Ký Ức',
    icon: BookMarked,
    accent: '#C79A5B',
    zone: 'portal',
    path: '/one/cay-ky-uc',
    bleed: true,
    desc: 'Kỷ yếu số 20 năm — lật từng trang như sách giấy, kèm nhạc nền kỷ niệm',
    items: [
      {
        label: 'Cây Ký Ức',
        icon: BookMarked,
        path: '/one/cay-ky-uc',
        bleed: true,
        keywords: ['cay ky uc', 'ky yeu', 'ky yeu so', 'so luu but', '20 nam', 'flipbook', 'sach lat'],
        // Đường dẫn thời còn tên "Kỷ yếu số" — giữ để không gãy link đã gửi
        extraPaths: ['/one/ky-yeu-so'],
      },
    ],
  },
  {
    // Bắc Hưng Yên Ways là NHÓM MENU, không phải một trang: bấm vào là bung ngay
    // 6 thương hiệu. Không dựng trang giới thiệu riêng vì Trang chủ đã giới thiệu
    // đủ — thêm một trang nữa là lặp lại chính nó.
    id: 'bhy-ways',
    label: 'Bắc Hưng Yên Ways',
    shortLabel: 'BHY Ways',
    icon: Compass,
    accent: '#0057B8',
    zone: 'portal',
    mobileOrder: 2,
    guestVisible: true,
    desc: 'Hệ sinh thái các phương thức, công cụ và cơ chế quản trị của Chi nhánh',
    items: [
      // Sharing + Kho tri thức là MỘT không gian 2 tab (chung một kho dữ liệu)
      {
        label: 'Bắc Hưng Yên Sharing',
        icon: BookOpen,
        path: '/one/hoc-hoi',
        guestVisible: true,
        bleed: true,
        keywords: ['chia se', 'kho tri thuc', 'tu lieu', 'thu vien', 'sharing', 'hoc hoi'],
        extraPaths: ['/one/kho-du-lieu'],
      },
      // Quizzi có nhà duy nhất tại /quizzi (kể cả khu quản trị bên trong)
      {
        label: 'Bắc Hưng Yên Quizzi',
        icon: Zap,
        path: '/quizzi',
        keywords: ['trac nghiem', 'thi', 'cau hoi', 'chien dich quiz', 'quizzi'],
        extraPaths: ['/quizzi/', '/quan-tri-quizzi'],
      },
      {
        label: 'Bắc Hưng Yên Ideas',
        icon: Lightbulb,
        path: '/one/y-tuong',
        bleed: true,
        keywords: ['y tuong', 'sang kien', 'cai tien', 'de xuat', 'ideas'],
        // Trang "Sáng kiến & Nghiệp vụ" cũ đã gộp về đây
        extraPaths: ['/one/sang-kien', '/one/bhy-ways'],
      },
      // Connect không có màn hình nghiệp vụ nên trang này chính là nhà của nó
      {
        label: 'Bắc Hưng Yên Connect',
        icon: Share2,
        path: '/one/bhy-connect',
        guestVisible: true,
        bleed: true,
        keywords: ['connect', 'hoi nghi khach hang', 'ket noi', 'he sinh thai doanh nghiep'],
      },
      {
        label: 'Sao Xứng Đáng',
        icon: Star,
        path: '/one/ghi-nhan',
        bleed: true,
        keywords: ['sao xung dang', 'khen thuong', 'vinh danh', 'tu qua', 'ghi nhan'],
      },
      {
        label: 'Bắc Hưng Yên Credit 360',
        icon: ShieldAlert,
        path: '/one/credit-360',
        bleed: true,
        keywords: ['tin dung', 'tham dinh', 'phien hop', 'credit 360'],
      },
    ],
  },
  {
    id: 'chieu-thuc-2',
    mobileOrder: 4,
    label: 'Chiêu thức 2',
    shortLabel: 'Chiêu thức 2',
    icon: Target,
    accent: '#2563EB',
    zone: 'portal',
    path: '/one/chieu-thuc-2',
    bleed: true,
    desc: 'Lập kế hoạch hành động SWOT → TOWS → 5W2H và theo nhịp PDCA toàn Chi nhánh',
    items: [
      {
        label: 'Kế hoạch hành động Chi nhánh',
        icon: Target,
        path: '/one/chieu-thuc-2',
        bleed: true,
        keywords: ['chieu thuc 2', 'ke hoach hanh dong', '5w2h', 'swot', 'tows', 'pdca', 'kanban phong'],
      },
    ],
  },

  // ---- Khu phân hệ 343: menu dọc nhiều tầng, phân quyền riêng ----
  {
    id: 'hr-343',
    mobileOrder: 3,
    label: 'Chiêu thức 3 - Phát triển nhân sự',
    shortLabel: 'Chiêu thức 3',
    icon: UsersRound,
    accent: '#2DD4BF',
    zone: 'workspace',
    desc: 'Chiêu thức số 3 — tự đánh giá năng lực, kế hoạch hành động và quản trị đội ngũ',
    items: [
      {
        // Khung năng lực là nội dung GIỚI THIỆU của Chiêu thức 3, tách khỏi các
        // màn hình làm việc để cán bộ tra cứu được mà không phải mở phiếu.
        id: 'khung-nang-luc',
        folder: 'Khung năng lực',
        icon: Layers,
        items: [
          {
            label: 'Bắc Hưng Yên 3806',
            icon: Layers,
            path: '/one/bhy-3806',
            bleed: true,
            keywords: ['3806', '38 skill', '06 thai do', 'khung nang luc', 'chieu thuc 3', 'level'],
          },
        ],
      },
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
            // Bản ghi hành vi được lãnh đạo chia sẻ đích danh cho cán bộ
            label: 'Hành vi của tôi',
            icon: Sprout,
            path: '/hanh-vi-cua-toi',
            keywords: ['hanh vi', 'hanh dong', 'khen ngoi', 'ghi nhan'],
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
          // Sổ tay ghi nhận hành vi cán bộ của lãnh đạo. minRole 'manager' khớp
          // quyền xem trang (manager/pgd/bgd/admin); trang tự gác chi tiết.
          { label: 'Nhật ký hành vi', icon: NotebookPen, path: '/nhat-ky-hanh-vi', minRole: 'manager', keywords: ['hanh vi', 'ghi nhanh', 'so tay', 'quan sat'] },
          { label: 'Phân nhóm cán bộ', icon: Star, path: '/phan-nhom-can-bo', minRole: 'manager', keywords: ['xep nhom', 'phan loai'] },
          { label: 'Báo cáo', icon: BarChart3, path: '/bao-cao', minRole: 'manager', keywords: ['thong ke', 'bieu do'] },
          // Hiển thị theo phạm vi: GĐ/PGĐ (phòng phụ trách), lãnh đạo Phòng TCTH + admin (full chi nhánh)
          { label: 'Báo cáo nộp biểu mẫu', icon: Timer, path: '/bao-cao-nop-bieu-mau', special: 'submission-report', keywords: ['tien do nop', 'han nop'] },
          // Khung dấu ấn BGĐ giao PGĐ — công cụ của Ban Giám đốc, khác Sao Xứng Đáng (khen thưởng chung)
          { label: 'Dấu ấn BHY Mark', icon: Star, path: '/dau-an', special: 'leadership-marks', keywords: ['bhy mark', 'dau an', 'giam doc'] },
        ],
      },
      {
        // Hội đồng đánh giá đầu mối là MỘT CẤU PHẦN RIÊNG: có kỳ chấm, hội đồng,
        // báo cáo và màn quản trị của chính nó. Gom đủ bốn màn hình vào một thư
        // mục để người dùng thấy trọn cấu phần ở một chỗ, thay vì ba màn nằm lẫn
        // trong "Quản trị đội ngũ" còn màn quản trị nằm tận thư mục cấu hình.
        // Quyền từng màn giữ nguyên: thành viên HĐ chấm điểm; đầu mối và quản trị
        // xem báo cáo; phân tích và cấu hình chỉ quản trị.
        id: 'hoi-dong-dau-moi',
        folder: 'Hội đồng đầu mối',
        icon: Gavel,
        items: [
          { label: 'Đánh giá đầu mối', icon: Gavel, path: '/danh-gia-dau-moi', special: 'council-member', keywords: ['hoi dong', 'cham diem'] },
          { label: 'Báo cáo đầu mối', icon: BarChart3, path: '/bao-cao-dau-moi', special: 'council-report', keywords: ['hoi dong', 'ket qua'] },
          { label: 'Phân tích đầu mối', icon: TrendingUp, path: '/phan-tich-dau-moi', minRole: 'admin', special: 'council-analytics', keywords: ['hoi dong', 'phan tich'] },
          { label: 'Quản trị Hội đồng đầu mối', icon: Gavel, path: '/quan-tri-hoi-dong-dau-moi', minRole: 'admin', keywords: ['cau hinh hoi dong', 'thanh vien'] },
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
        // Chỉ còn công cụ phục vụ RIÊNG kỳ đánh giá nhân sự. Bốn mục dùng chung
        // toàn cổng (tin tức, mẹo tính năng, email, cài đặt) đã chuyển sang khu
        // "Quản trị chung" — xem ghi chú ở khu đó.
        id: 'ban-tin-tro-ly-ai',
        folder: 'Bản tin & Trợ lý AI',
        icon: Newspaper,
        items: [
          // Thư tổng kết phát triển cá nhân cuối kỳ, dựng từ phiếu tự đánh giá của kỳ
          { label: 'Bản tin quý', icon: Newspaper, path: '/ban-tin-quy', minRole: 'admin' },
          // 9 prompt thì 7 phục vụ nghiệp vụ đánh giá (skill, IDP, minh chứng,
          // phiên 1-1, thư cuối kỳ) — trợ lý AI chỉ chạy trong phân hệ này
          { label: 'Quản trị AI & Prompt', icon: Sparkles, path: '/quan-tri-ai', minRole: 'admin' },
        ],
      },
    ],
  },

  // ---- Quản trị CHUNG toàn cổng (nguyên lý chieuthuc3.com: một danh sách cán
  // bộ + một hệ phân quyền, mọi phân hệ dùng chung).
  //
  // Ở đây đặt những thứ KHÔNG thuộc riêng phân hệ nào: người dùng, nội dung
  // cổng và hệ thống. Trước đây tin tức, mẹo tính năng, email và cài đặt nằm
  // trong phân hệ Phát triển nhân sự — sai chỗ, vì cả bốn đều phục vụ toàn cổng:
  // tin tức hiện trên Trang chủ ONE, mẹo tính năng hiện ở mọi trang, email là
  // hàng đợi chung, cài đặt là phiên bản ứng dụng. ----
  {
    id: 'user-admin',
    mobileOrder: 5,
    label: 'Quản trị chung',
    shortLabel: 'Quản trị',
    icon: Shield,
    accent: '#FB7185',
    zone: 'workspace',
    desc: 'Người dùng, nội dung cổng và hệ thống — dùng chung cho mọi phân hệ',
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
      {
        // Nội dung hiển thị cho TOÀN CỔNG, không riêng phân hệ nào
        id: 'noi-dung-cong',
        folder: 'Nội dung cổng',
        icon: Newspaper,
        items: [
          // Tin hiện trên Trang chủ ONE và trang Tin tức; dùng chung kho dữ liệu
          // với Kho tri thức nên cán bộ đăng một lần là cả hai nơi cùng có
          {
            label: 'Quản trị tin tức nội bộ',
            icon: Newspaper,
            path: '/quan-tri-tin-tuc',
            minRole: 'admin',
            keywords: ['tin tuc', 'ghim tin', 'bien tap', 'dong chia se'],
          },
          // Ấn phẩm của tab Cây Ký Ức trên cổng ONE: thay PDF/nhạc nền,
          // xuất bản — RLS chỉ cho TCTH admin / System admin ghi
          {
            label: 'Quản trị Cây Ký Ức',
            icon: BookMarked,
            path: '/quan-tri-ky-yeu',
            minRole: 'admin',
            keywords: ['cay ky uc', 'ky yeu', 'flipbook', 'an pham', '20 nam', 'nhac nen'],
          },
          // Mẹo hiện ở banner Trang chủ, hộp nhắc một lần và trang Mẹo hay —
          // áp dụng cho mọi vai trò, mọi phân hệ
          { label: 'Mẹo tính năng', icon: Lightbulb, path: '/quan-ly-meo-tinh-nang', minRole: 'admin', keywords: ['tips', 'huong dan'] },
          // Hòm tiếp nhận góp ý cải thiện BHY One (cán bộ gửi qua nút «Góp ý»
          // trên thanh điều hướng). minRole 'admin' = bgd/tcth_admin/system_admin
          // — đúng nhóm tiếp nhận: Phòng TCTH và Giám đốc Chi nhánh.
          {
            label: 'Góp ý hệ thống ONE',
            icon: MessagesSquare,
            path: '/gop-y-he-thong',
            minRole: 'admin',
            keywords: ['gop y', 'phan hoi', 'cai thien', 'feedback', 'y kien'],
          },
        ],
      },
      {
        id: 'he-thong-chung',
        folder: 'Hệ thống',
        icon: SettingsIcon,
        items: [
          // Hàng đợi email của cả hệ thống: nhắc nộp phiếu, thông báo, quiz…
          { label: 'Quản trị Email', icon: Mail, path: '/quan-tri-email', minRole: 'admin', keywords: ['hang doi', 'gui mail'] },
          // Lịch nghỉ lễ + mốc giờ nhịp: mọi đồng hồ đếm ngày làm việc của chi
          // nhánh đọc từ đây (tuổi thẻ Kanban, tuổi hồ sơ tín dụng, số ngày im
          // lặng, mốc phát thông báo) — dùng chung, không riêng phân hệ nào
          {
            label: 'Cài đặt ngày giờ',
            icon: CalendarDays,
            path: '/lich-nghi-le',
            minRole: 'admin',
            keywords: ['ngay nghi', 'nghi le', 'tet', 'gio to', 'lam bu', 'ngay lam viec',
              'moc gio', 'gio nhip', 'gio giao ban', 'nguong canh bao'],
          },
          // Phiên bản ứng dụng, lịch sử nâng cấp, bảng tham chiếu vai trò
          { label: 'Cài đặt', icon: SettingsIcon, path: '/cai-dat', minRole: 'admin', keywords: ['phien ban', 'he thong'] },
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
