import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, TreeDeciduous, BookOpen, Lightbulb, Star, Users, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Thanh điều hướng cổng BHY ONE — 6 menu theo cấu trúc đã duyệt
// (docs/so-do-site-bhy-one.md). Khách đối tác chỉ thấy các mục được mở.
const SECTIONS = [
  { to: '/one', label: 'Trang chủ', icon: Home, end: true },
  { to: '/one/nguon-coi', label: 'Nguồn cội & Bản sắc', icon: TreeDeciduous },
  { to: '/one/hoc-hoi', label: 'Học hỏi & Chia sẻ', icon: BookOpen },
  { to: '/one/sang-kien', label: 'Sáng kiến & Nghiệp vụ', icon: Lightbulb, staffOnly: true, alsoActive: ['/one/y-tuong', '/one/credit-360'] },
  { to: '/one/ghi-nhan', label: 'Ghi nhận & Lan tỏa', icon: Star, staffOnly: true },
  { to: '/tong-quan', label: 'Nhân sự 343', icon: Users, staffOnly: true },
];

export const OneSectionNav: React.FC = () => {
  const { isGuest } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          <div className="hidden sm:flex items-center gap-2 pr-3 mr-2 border-r border-slate-200 shrink-0">
            <span className="h-7 px-2 bg-brand-royal text-white font-black tracking-tighter text-sm rounded flex items-center">
              VietinBank
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wide text-brand-navy whitespace-nowrap">
              BHY ONE
            </span>
          </div>
          {SECTIONS.filter(s => !isGuest || !s.staffOnly).map(({ to, label, icon: Icon, end, alsoActive }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive || alsoActive?.includes(pathname)
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-brand-navy hover:bg-blue-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
          {/* Liên hệ: cuộn tới ContactSection trên trang chủ cổng (không có trạng thái active) */}
          <Link
            to={{ pathname: '/one', hash: '#contact' }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors text-slate-600 hover:text-brand-navy hover:bg-blue-50"
          >
            <Phone className="w-4 h-4" />
            Liên hệ
          </Link>
        </div>
      </div>
    </nav>
  );
};
