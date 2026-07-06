import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Shield, LogOut, Target,
  User, UsersRound, Star,
  Upload, Settings as SettingsIcon, BarChart3, Image, FileText,
  ChevronDown, ChevronRight, UserCheck, Sparkles, GraduationCap, ClipboardList, KeyRound, ListPlus,
  CalendarClock, Timer, MessagesSquare, Mail, ShieldAlert, Route, ArrowLeftRight, Newspaper, Flag,
  ListChecks, Building2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissionReportAccess } from '@/hooks/useSubmissionReportAccess';
import { useStrategicHrAccess } from '@/hooks/useStrategicHrAccess';
import { useState } from 'react';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';
import { BrandBadge } from '@/components/branding/BrandAssets';

type MinRole = 'manager' | 'admin';

interface NavGroup {
  label: string;
  items: { label: string; icon: any; path: string; minRole?: MinRole; special?: 'submission-report' | 'strategic-hr' }[];
}

// Menu tinh gọn theo thực tế sử dụng của cán bộ.
// Các trang sau bị BỎ KHỎI MENU (route vẫn hoạt động để không gãy link cũ):
// - /skill-bo-sung, /thai-do-tu-duy: placeholder trống — nội dung thật nằm trong Tự đánh giá (mục B/C)
// - /ke-hoach-phat-trien: đọc đường dữ liệu cũ (admin_evaluations) không còn được ghi — IDP thật ở mục D
// - /ung-dung-ai: dữ liệu demo hard-code
// - /bieu-mau-01|02|03: kênh nhập trùng với Tự đánh giá, dễ phá trạng thái phiếu duyệt
const navGroups: NavGroup[] = [
  {
    label: 'Cá nhân / Năng lực',
    items: [
      { label: 'Tổng quan', icon: LayoutDashboard, path: '/tong-quan' },
      { label: 'Tự đánh giá', icon: FileText, path: '/tu-danh-gia' },
      { label: 'Hành động phát triển', icon: ClipboardList, path: '/hanh-dong-phat-trien' },
      { label: 'Chiến dịch học tập', icon: Flag, path: '/chien-dich-hoc-tap' },
      { label: 'Skill lõi theo vị trí', icon: Target, path: '/skill-loi-theo-vi-tri' },
      { label: 'Hồ sơ cá nhân', icon: User, path: '/ho-so-ca-nhan' },
      { label: 'Đổi mật khẩu', icon: KeyRound, path: '/doi-mat-khau' },
    ],
  },
  {
    label: 'Quản trị đội ngũ',
    items: [
      { label: 'Đội ngũ phòng ban', icon: UsersRound, path: '/doi-ngu-phong-ban', minRole: 'manager' },
      { label: 'Đánh giá cán bộ', icon: ClipboardList, path: '/danh-gia-can-bo', minRole: 'manager' },
      { label: 'Phân nhóm cán bộ', icon: Star, path: '/phan-nhom-can-bo', minRole: 'manager' },
      { label: 'Danh sách cán bộ', icon: Users, path: '/danh-sach-can-bo', minRole: 'manager' },
      { label: 'Báo cáo', icon: BarChart3, path: '/bao-cao', minRole: 'manager' },
      // Hiển thị theo phạm vi: GĐ/PGĐ (phòng phụ trách), lãnh đạo Phòng TCTH + admin (full chi nhánh)
      { label: 'Báo cáo nộp biểu mẫu', icon: Timer, path: '/bao-cao-nop-bieu-mau', special: 'submission-report' },
      { label: 'Thêm cán bộ', icon: UserPlus, path: '/them-can-bo', minRole: 'admin' },
      { label: 'Nhập nhanh theo phòng', icon: ListPlus, path: '/nhap-nhanh-can-bo', minRole: 'admin' },
      { label: 'Phân quyền', icon: Shield, path: '/phan-quyen', minRole: 'admin' },
    ],
  },
  {
    // Nhóm dành cho Phòng Tổ chức Tổng hợp + Ban Giám đốc (dữ liệu toàn chi nhánh)
    label: 'Chiến lược nhân sự',
    items: [
      { label: 'Bản đồ rủi ro năng lực', icon: ShieldAlert, path: '/ban-do-rui-ro-nang-luc', special: 'strategic-hr' },
      { label: 'Con đường sự nghiệp', icon: Route, path: '/con-duong-su-nghiep', special: 'strategic-hr' },
      { label: 'Mô phỏng điều chuyển', icon: ArrowLeftRight, path: '/mo-phong-dieu-chuyen', special: 'strategic-hr' },
    ],
  },
  {
    label: 'Cấu hình / Hệ thống',
    items: [
      { label: 'Phòng ban & Chức danh', icon: Building2, path: '/quan-ly-phong-ban', minRole: 'admin' },
      { label: 'Quản lý kỳ đánh giá', icon: CalendarClock, path: '/quan-ly-ky-danh-gia', minRole: 'admin' },
      { label: 'Câu hỏi 1-1 theo kỳ', icon: MessagesSquare, path: '/quan-tri-cau-hoi-1-1', minRole: 'admin' },
      { label: 'Bản tin quý', icon: Newspaper, path: '/ban-tin-quy', minRole: 'admin' },
      { label: 'Upload danh sách CB', icon: Upload, path: '/upload-danh-sach-cb', minRole: 'admin' },
      { label: 'Cấu hình skill lõi', icon: Target, path: '/cau-hinh-skill-loi', minRole: 'admin' },
      { label: 'Tiêu chí level skill', icon: ListChecks, path: '/quan-tri-tieu-chi-level', minRole: 'admin' },
      { label: 'Quản trị hình ảnh skill', icon: Image, path: '/quan-tri-hinh-anh-skill', minRole: 'admin' },
      { label: 'Duyệt yêu cầu user', icon: UserCheck, path: '/duyet-yeu-cau-user', minRole: 'admin' },
      { label: 'Quản trị AI & Prompt', icon: Sparkles, path: '/quan-tri-ai', minRole: 'admin' },
      { label: 'Quản trị Email', icon: Mail, path: '/quan-tri-email', minRole: 'admin' },
      { label: 'Khóa học VietinBank', icon: GraduationCap, path: '/quan-tri-khoa-hoc-vtb', minRole: 'admin' },
      { label: 'Cài đặt', icon: SettingsIcon, path: '/cai-dat', minRole: 'admin' },
    ],
  },
];

interface Props {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isManager, isPgd } = useAuth();
  const reportAccess = useSubmissionReportAccess();
  const strategicAccess = useStrategicHrAccess();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsed((p) => ({ ...p, [label]: !p[label] }));
  };

  const canSeeManagerItems = isAdmin || isManager || isPgd;

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
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
          <div className="text-sm font-bold text-sidebar-primary tracking-wide truncate">343 Phát triển nhân sự</div>
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

      <nav className="flex-1 min-h-0 px-2 py-3 space-y-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-sidebar-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.special === 'submission-report') return reportAccess.allowed;
            if (item.special === 'strategic-hr') return strategicAccess.allowed;
            if (item.minRole === 'admin' && !isAdmin) return false;
            if (item.minRole === 'manager' && !canSeeManagerItems) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;

          const isCollapsed = collapsed[group.label];

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              >
                <span>{group.label}</span>
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`nav-item w-full ${active ? 'active' : ''}`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-[13px]">{item.label}</span>
                      </button>
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
