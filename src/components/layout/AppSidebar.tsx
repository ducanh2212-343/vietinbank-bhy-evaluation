import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Shield, LogOut, Target,
  User, UsersRound, Star,
  Upload, Settings as SettingsIcon, BarChart3, Image, FileText,
  ChevronRight, UserCheck, Sparkles, GraduationCap, ClipboardList, KeyRound, ListPlus,
  CalendarClock, Timer, MessagesSquare, Mail, ShieldAlert, Route, ArrowLeftRight, Newspaper, Flag, GitBranch,
  ListChecks, Building2, Gavel, TrendingUp, Zap, Lightbulb,
  Home, BookOpen, TreeDeciduous
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissionReportAccess } from '@/hooks/useSubmissionReportAccess';
import { useStrategicHrAccess } from '@/hooks/useStrategicHrAccess';
import { useCouncilAccess } from '@/hooks/useCouncilAccess';
import { useEffect, useState } from 'react';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';
import { BrandBadge } from '@/components/branding/BrandAssets';

type MinRole = 'manager' | 'admin';
type Special = 'submission-report' | 'strategic-hr' | 'council-member' | 'council-report' | 'council-analytics' | 'leadership-marks';

interface NavLeaf {
  label: string;
  icon: any;
  path: string;
  minRole?: MinRole;
  special?: Special;
  /** Khách đối tác không thấy mục này (mặc định: không thấy) */
  guestVisible?: boolean;
}

// Thư mục con — gom các trang cùng chủ đề trong một nhóm lớn, thu gọn được độc lập
interface NavFolder {
  id: string;
  folder: string;
  icon: any;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavFolder;

interface NavGroup {
  label: string;
  icon: any;
  accent: string; // màu nhận diện nhóm (hợp trên nền navy, cả sáng/tối)
  /** Mục cấp 1 dẫn thẳng tới một trang (không bung nhóm con) */
  path?: string;
  items?: NavEntry[];
  /** Khách đối tác được thấy mục cấp 1 này */
  guestVisible?: boolean;
}

function isFolder(e: NavEntry): e is NavFolder {
  return 'items' in e;
}

// Menu tinh gọn theo thực tế sử dụng của cán bộ.
// Các trang sau bị BỎ KHỎI MENU (route vẫn hoạt động để không gãy link cũ):
// - /skill-bo-sung, /thai-do-tu-duy: placeholder trống — nội dung thật nằm trong Tự đánh giá (mục B/C)
// - /ke-hoach-phat-trien: đọc đường dữ liệu cũ (admin_evaluations) không còn được ghi — IDP thật ở mục D
// - /ung-dung-ai: dữ liệu demo hard-code
// - /bieu-mau-01|02|03: kênh nhập trùng với Tự đánh giá, dễ phá trạng thái phiếu duyệt
const navGroups: NavGroup[] = [
  // ---- Cấp 1: 5 khu của cổng BHY ONE (docs/so-do-site-bhy-one.md) ----
  {
    label: 'Trang chủ ONE',
    icon: Home,
    accent: '#F87171',
    path: '/one',
    guestVisible: true,
  },
  {
    label: 'Nguồn cội & Bản sắc',
    icon: TreeDeciduous,
    accent: '#34D399',
    path: '/one/nguon-coi',
    guestVisible: true,
  },
  {
    label: 'Học hỏi & Chia sẻ',
    icon: BookOpen,
    accent: '#4AA3F0',
    guestVisible: true,
    items: [
      // Sharing + Kho tri thức là MỘT không gian 2 tab (chung một kho dữ liệu)
      { label: 'Sharing & Kho tri thức', icon: BookOpen, path: '/one/hoc-hoi', guestVisible: true },
      // Quizzi có nhà duy nhất tại /quizzi (kể cả khu quản trị bên trong)
      { label: 'BHY Quizzi', icon: Zap, path: '/quizzi' },
    ],
  },
  {
    label: 'Sáng kiến & Nghiệp vụ',
    icon: Lightbulb,
    accent: '#FB923C',
    items: [
      { label: 'BHY Ideas', icon: Lightbulb, path: '/one/y-tuong' },
      { label: 'BHY Credit 360', icon: ShieldAlert, path: '/one/credit-360' },
    ],
  },
  {
    label: 'Ghi nhận & Lan tỏa',
    icon: Star,
    accent: '#FBBF24',
    path: '/one/ghi-nhan',
  },

  // ---- Cấp 1: phân hệ chuyên sâu 343, menu nhiều tầng và phân quyền riêng ----
  {
    label: 'Phát triển nhân sự 343',
    icon: UsersRound,
    accent: '#2DD4BF',
    items: [
      {
        id: 'ca-nhan-343',
        folder: 'Cá nhân',
        icon: User,
        items: [
          { label: 'Tổng quan', icon: LayoutDashboard, path: '/tong-quan' },
          { label: 'Tự đánh giá', icon: FileText, path: '/tu-danh-gia' },
          { label: 'Hành động phát triển', icon: ClipboardList, path: '/hanh-dong-phat-trien' },
          { label: 'Hồ sơ cá nhân', icon: User, path: '/ho-so-ca-nhan' },
          { label: 'Đổi mật khẩu', icon: KeyRound, path: '/doi-mat-khau' },
        ],
      },
      {
        id: 'hoc-tap-343',
        folder: 'Học tập',
        icon: GraduationCap,
        items: [
          { label: 'Chiến dịch học tập', icon: Flag, path: '/chien-dich-hoc-tap' },
          { label: 'Mẹo hay', icon: Lightbulb, path: '/meo-hay' },
          { label: 'Skill lõi theo vị trí', icon: Target, path: '/skill-loi-theo-vi-tri' },
        ],
      },
      {
        id: 'quan-tri-doi-ngu',
        folder: 'Quản trị đội ngũ',
        icon: UsersRound,
        items: [
          { label: 'Đội ngũ phòng ban', icon: UsersRound, path: '/doi-ngu-phong-ban', minRole: 'manager' },
          { label: 'Đánh giá cán bộ', icon: ClipboardList, path: '/danh-gia-can-bo', minRole: 'manager' },
          // Màn điều hành Kanban kế hoạch hành động quý: TP (phòng), PGĐ (khối), TCTH/BGĐ (toàn CN)
          { label: 'Quản lý hành động Kanban', icon: ListChecks, path: '/quan-ly-hanh-dong', minRole: 'manager' },
          { label: 'Phân nhóm cán bộ', icon: Star, path: '/phan-nhom-can-bo', minRole: 'manager' },
          { label: 'Danh sách cán bộ', icon: Users, path: '/danh-sach-can-bo', minRole: 'manager' },
          { label: 'Báo cáo', icon: BarChart3, path: '/bao-cao', minRole: 'manager' },
          // Hiển thị theo phạm vi: GĐ/PGĐ (phòng phụ trách), lãnh đạo Phòng TCTH + admin (full chi nhánh)
          { label: 'Báo cáo nộp biểu mẫu', icon: Timer, path: '/bao-cao-nop-bieu-mau', special: 'submission-report' },
          // Khung dấu ấn BGĐ giao PGĐ — công cụ của Ban Giám đốc, khác Sao Xứng Đáng (khen thưởng chung)
          { label: 'Dấu ấn BHY Mark', icon: Star, path: '/dau-an', special: 'leadership-marks' },
          // Hội đồng đánh giá đầu mối: thành viên HĐ chấm điểm; đầu mối + admin xem báo cáo
          { label: 'Đánh giá đầu mối', icon: Gavel, path: '/danh-gia-dau-moi', special: 'council-member' },
          { label: 'Báo cáo đầu mối', icon: BarChart3, path: '/bao-cao-dau-moi', special: 'council-report' },
          { label: 'Phân tích đầu mối', icon: TrendingUp, path: '/phan-tich-dau-moi', minRole: 'admin', special: 'council-analytics' },
        ],
      },
      {
        // Dành cho Phòng Tổ chức Tổng hợp + Ban Giám đốc (dữ liệu toàn chi nhánh)
        id: 'chien-luoc-nhan-su',
        folder: 'Chiến lược nhân sự',
        icon: Route,
        items: [
          { label: 'Bản đồ rủi ro năng lực', icon: ShieldAlert, path: '/ban-do-rui-ro-nang-luc', special: 'strategic-hr' },
          { label: 'Con đường sự nghiệp', icon: Route, path: '/con-duong-su-nghiep', special: 'strategic-hr' },
          { label: 'Mô phỏng điều chuyển', icon: ArrowLeftRight, path: '/mo-phong-dieu-chuyen', special: 'strategic-hr' },
        ],
      },
      {
        id: 'cau-hinh-danh-gia',
        folder: 'Cấu hình đánh giá',
        icon: CalendarClock,
        items: [
          { label: 'Quản lý kỳ đánh giá', icon: CalendarClock, path: '/quan-ly-ky-danh-gia', minRole: 'admin' },
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

  // ---- Cấp 1: quản trị người dùng CHUNG toàn cổng (nguyên lý chieuthuc3.com:
  // một danh sách cán bộ + một hệ phân quyền, mọi phân hệ dùng chung) ----
  {
    label: 'Quản trị người dùng',
    icon: Shield,
    accent: '#FB7185',
    items: [
      { label: 'Thêm cán bộ', icon: UserPlus, path: '/them-can-bo', minRole: 'admin' },
      { label: 'Nhập nhanh theo phòng', icon: ListPlus, path: '/nhap-nhanh-can-bo', minRole: 'admin' },
      { label: 'Upload danh sách CB', icon: Upload, path: '/upload-danh-sach-cb', minRole: 'admin' },
      { label: 'Phòng ban & Chức danh', icon: Building2, path: '/quan-ly-phong-ban', minRole: 'admin' },
      { label: 'Phân quyền', icon: Shield, path: '/phan-quyen', minRole: 'admin' },
      { label: 'Duyệt yêu cầu user', icon: UserCheck, path: '/duyet-yeu-cau-user', minRole: 'admin' },
      { label: 'Tài khoản khách đối tác', icon: UserCheck, path: '/quan-tri-khach', minRole: 'admin' },
    ],
  },
];

const GROUP_KEY = 'vtb-nav-group';
const FOLDERS_KEY = 'vtb-nav-folders';

function loadFolders(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* dữ liệu hỏng — dùng mặc định */ }
  return {};
}

interface Props {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isManager, isPgd, isGuest, roles } = useAuth();
  // Khách đối tác chỉ thấy các khu được mở của cổng (kèm nút Đăng xuất ở cuối sidebar)
  const visibleGroups = isGuest ? navGroups.filter((g) => g.guestVisible) : navGroups;
  const reportAccess = useSubmissionReportAccess();
  const strategicAccess = useStrategicHrAccess();
  const councilAccess = useCouncilAccess();
  // Quản trị/tổng hợp Hội đồng đầu mối: chỉ Giám đốc Chi nhánh + TCTH/System admin.
  // Phó Giám đốc (role 'bgd' nhưng không phải Giám đốc) là user quản lý, không có quyền tổng hợp toàn chi nhánh.
  const isFullCouncilAdmin =
    roles.includes('tcth_admin') || roles.includes('system_admin') || councilAccess.memberGroup === 'giam_doc';

  const canSeeManagerItems = isAdmin || isManager || isPgd;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const canSeeLeaf = (item: NavLeaf) => {
    // Khách đối tác chỉ thấy mục được mở tường minh (fail-closed)
    if (isGuest) return !!item.guestVisible;
    // Special (theo phạm vi/hội đồng) được ưu tiên xét trước minRole
    if (item.special === 'submission-report') return reportAccess.allowed;
    if (item.special === 'strategic-hr') return strategicAccess.allowed;
    if (item.special === 'council-member') return councilAccess.isMember;
    if (item.special === 'council-report') return isAdmin || councilAccess.isSubject || councilAccess.isSupervisor;
    if (item.special === 'council-analytics') return isFullCouncilAdmin;
    if (item.special === 'leadership-marks') return isAdmin || isPgd;
    if (item.minRole === 'admin' && !isAdmin) return false;
    if (item.minRole === 'manager' && !canSeeManagerItems) return false;
    return true;
  };

  // Nhóm nào chứa trang đang xem (tìm cả trong thư mục con)
  const groupOfPath = (): string | null => {
    for (const g of navGroups) {
      for (const e of g.items ?? []) {
        const leaves = isFolder(e) ? e.items : [e];
        if (leaves.some((l) => isActive(l.path))) return g.label;
      }
    }
    return null;
  };
  const folderOfPath = (): string | null => {
    for (const g of navGroups) {
      for (const e of g.items ?? []) {
        if (isFolder(e) && e.items.some((l) => isActive(l.path))) return e.id;
      }
    }
    return null;
  };

  // Accordion cấp nhóm: mở đúng một nhóm (ưu tiên nhóm chứa trang hiện tại).
  // Mặc định không bung nhóm nào để 5 khu của cổng ONE hiện ngay trong tầm mắt.
  const [openGroup, setOpenGroup] = useState<string>(() => {
    const active = groupOfPath();
    if (active) return active;
    return localStorage.getItem(GROUP_KEY) || '';
  });
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(loadFolders);

  // Vào trang bằng link trực tiếp: tự mở nhóm + thư mục chứa trang đó
  useEffect(() => {
    const g = groupOfPath();
    if (g) setOpenGroup(g);
    const f = folderOfPath();
    if (f) setOpenFolders((p) => (p[f] ? p : { ...p, [f]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem(GROUP_KEY, openGroup); } catch { /* ignore */ }
  }, [openGroup]);
  useEffect(() => {
    try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(openFolders)); } catch { /* ignore */ }
  }, [openFolders]);

  const toggleGroup = (label: string) => setOpenGroup((prev) => (prev === label ? '' : label));
  const toggleFolder = (id: string) => setOpenFolders((p) => ({ ...p, [id]: !p[id] }));

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const renderLeaf = (item: NavLeaf) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => handleNav(item.path)}
        className={`nav-leaf w-full ${active ? 'active' : ''}`}
      >
        <item.icon className="nav-leaf-ico w-[15px] h-[15px] flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="flex flex-col bg-sidebar w-60 h-full flex-shrink-0 overflow-hidden relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.08), transparent)' }}
      />
      <div className="relative flex items-center gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-soft">
          <img src={vtbLogo} alt="VietinBank Bắc Hưng Yên" className="w-full h-full object-contain" />
        </div>
        <div className="overflow-hidden min-w-0">
          <div className="text-sm font-bold text-sidebar-primary tracking-wide truncate">BHY ONE</div>
          <div className="text-[10px] text-sidebar-muted truncate">VietinBank Bắc Hưng Yên</div>
        </div>
      </div>

      {/* Dải kỷ niệm 20 năm — motif Cây ký ức */}
      <div className="relative mx-3 mb-1 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
        <BrandBadge className="h-7 w-7 rounded-full bg-white/95 p-0.5 shrink-0 object-contain" />
        <div className="min-w-0 leading-tight">
          <div className="text-[10px] font-semibold text-sidebar-primary truncate">20 năm · Vun gốc bền rễ</div>
          <div className="text-[9px] text-sidebar-muted truncate">Vươn tầm tương lai · 2006–2026</div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 px-2 py-3 space-y-0.5 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-sidebar-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {visibleGroups.map((group) => {
          const style = { ['--gc' as any]: group.accent } as React.CSSProperties;

          // Mục cấp 1 dẫn thẳng tới một trang (Trang chủ ONE, Nguồn cội, Ghi nhận…)
          if (group.path) {
            const active = isActive(group.path);
            return (
              <div key={group.label} className={`nav-group ${active ? 'nav-link-active' : ''}`} style={style}>
                <button
                  onClick={() => handleNav(group.path!)}
                  aria-current={active ? 'page' : undefined}
                  className="nav-group-head w-full"
                >
                  <span className="nav-group-icon">
                    <group.icon className="w-4 h-4" />
                  </span>
                  <span className="nav-group-label flex-1 text-left truncate">{group.label}</span>
                </button>
              </div>
            );
          }

          // Lọc quyền: thư mục chỉ hiện khi có ≥1 mục con được phép; nhóm chỉ hiện khi có ≥1 entry
          const visibleEntries = (group.items ?? [])
            .map((e): NavEntry | null => {
              if (isFolder(e)) {
                const items = e.items.filter(canSeeLeaf);
                return items.length ? { ...e, items } : null;
              }
              return canSeeLeaf(e) ? e : null;
            })
            .filter((e): e is NavEntry => e !== null);
          if (visibleEntries.length === 0) return null;

          const open = openGroup === group.label;

          return (
            <div key={group.label} className={`nav-group ${open ? 'open' : ''}`} style={style}>
              <button
                onClick={() => toggleGroup(group.label)}
                aria-expanded={open}
                className="nav-group-head w-full"
              >
                <span className="nav-group-icon">
                  <group.icon className="w-4 h-4" />
                </span>
                <span className="nav-group-label flex-1 text-left truncate">{group.label}</span>
                <ChevronRight className="nav-group-chev" />
              </button>

              {open && (
                <div className="nav-group-body">
                  {visibleEntries.map((e) => {
                    if (!isFolder(e)) return renderLeaf(e);
                    const fOpen = !!openFolders[e.id];
                    return (
                      <div key={e.id} className={`nav-folder ${fOpen ? 'open' : ''}`}>
                        <button
                          onClick={() => toggleFolder(e.id)}
                          aria-expanded={fOpen}
                          className="nav-folder-head w-full"
                        >
                          <e.icon className="nav-leaf-ico w-[15px] h-[15px] flex-shrink-0" />
                          <span className="flex-1 text-left truncate">{e.folder}</span>
                          <ChevronRight className="nav-folder-chev flex-shrink-0" />
                        </button>
                        {fOpen && <div className="nav-folder-body">{e.items.map(renderLeaf)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        onClick={() => { signOut(); onNavigate?.(); }}
        className="flex items-center gap-3 px-5 py-3 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-primary transition-colors text-sm flex-shrink-0"
      >
        <LogOut className="w-4 h-4" />
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}
