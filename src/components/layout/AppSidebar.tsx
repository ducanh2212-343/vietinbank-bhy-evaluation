import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Shield, LogOut, Target,
  User, BookOpen, PlusCircle, Brain, Heart, UsersRound, Star,
  Upload, Settings as SettingsIcon, BarChart3, Image, FileText,
  ChevronDown, ChevronRight, UserCheck, Sparkles, GraduationCap, ClipboardList
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';

type MinRole = 'manager' | 'admin';

interface NavGroup {
  label: string;
  items: { label: string; icon: any; path: string; minRole?: MinRole }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Cá nhân / Năng lực',
    items: [
      { label: 'Tổng quan', icon: LayoutDashboard, path: '/tong-quan' },
      { label: 'Hồ sơ cá nhân', icon: User, path: '/ho-so-ca-nhan' },
      { label: 'Skill lõi theo vị trí', icon: Target, path: '/skill-loi-theo-vi-tri' },
      { label: 'Skill bổ sung', icon: PlusCircle, path: '/skill-bo-sung' },
      { label: 'Tự đánh giá', icon: FileText, path: '/tu-danh-gia' },
      { label: 'Kế hoạch phát triển', icon: BookOpen, path: '/ke-hoach-phat-trien' },
      { label: 'Hành động phát triển', icon: ClipboardList, path: '/hanh-dong-phat-trien' },

      { label: 'Ứng dụng AI', icon: Brain, path: '/ung-dung-ai' },
      { label: 'Thái độ & tư duy', icon: Heart, path: '/thai-do-tu-duy' },
      { label: 'BM01 - Q1→Q2', icon: FileText, path: '/bieu-mau-01' },
      { label: 'BM02 - Q2→Q3', icon: FileText, path: '/bieu-mau-02' },
      { label: 'BM03 - Q3→Q4', icon: FileText, path: '/bieu-mau-03' },
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
      { label: 'Thêm cán bộ', icon: UserPlus, path: '/them-can-bo', minRole: 'admin' },
      { label: 'Phân quyền', icon: Shield, path: '/phan-quyen', minRole: 'admin' },
    ],
  },
  {
    label: 'Cấu hình / Hệ thống',
    items: [
      { label: 'Upload danh sách CB', icon: Upload, path: '/upload-danh-sach-cb', minRole: 'admin' },
      { label: 'Cấu hình skill lõi', icon: Target, path: '/cau-hinh-skill-loi', minRole: 'admin' },
      { label: 'Quản trị hình ảnh skill', icon: Image, path: '/quan-tri-hinh-anh-skill', minRole: 'admin' },
      { label: 'Duyệt yêu cầu user', icon: UserCheck, path: '/duyet-yeu-cau-user', minRole: 'admin' },
      { label: 'Quản trị AI & Prompt', icon: Sparkles, path: '/quan-tri-ai', minRole: 'admin' },
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

      <nav className="flex-1 min-h-0 px-2 py-3 space-y-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-sidebar-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
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
