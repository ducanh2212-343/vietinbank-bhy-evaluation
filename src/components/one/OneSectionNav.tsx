import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, Sparkles, Zap, FolderOpen, Phone } from 'lucide-react';

// Thanh điều hướng nội bộ của cổng BHY one — thay cho Navbar cuộn trang của bản gốc.
const SECTIONS = [
  { to: '/one', label: 'Trang chủ', icon: Home, end: true },
  { to: '/one/dac-trung', label: 'Đặc trưng Riêng có', icon: Sparkles },
  { to: '/one/chieu-thuc', label: 'Bộ 3 Chiêu thức', icon: Zap },
  { to: '/one/kho-du-lieu', label: 'Kho Dữ Liệu', icon: FolderOpen },
];

export const OneSectionNav: React.FC = () => {
  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          <div className="hidden sm:flex items-center gap-2 pr-3 mr-2 border-r border-slate-200 shrink-0">
            <span className="h-7 px-2 bg-brand-royal text-white font-black tracking-tighter text-sm rounded flex items-center">
              VietinBank
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wide text-brand-navy whitespace-nowrap">
              BHY one
            </span>
          </div>
          {SECTIONS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
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
