import { Link } from 'react-router-dom';
import { Sparkles, Zap, Camera, FolderOpen, ArrowRight, TreeDeciduous } from 'lucide-react';

// Dải thương hiệu BHY one trên trang Tổng quan — phần "hòa" cổng thông tin vào dashboard.
const CHIPS = [
  { to: '/one', icon: TreeDeciduous, label: 'Cây văn hóa' },
  { to: '/one/dac-trung', icon: Sparkles, label: '6 Đặc trưng' },
  { to: '/one/chieu-thuc', icon: Zap, label: 'Bộ 3 Chiêu thức' },
  { to: '/one/khung-hinh', icon: Camera, label: 'Ảnh 20 Năm' },
  { to: '/one/kho-du-lieu', icon: FolderOpen, label: 'Kho Dữ Liệu' },
];

export function OneStripCard() {
  return (
    <div className="rounded-2xl border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-r from-brand-navy via-brand-royal to-brand-navy text-white p-4 sm:p-5 shadow-soft overflow-hidden relative">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 relative">
        <div className="min-w-0">
          <Link to="/one" className="inline-flex items-center gap-2 group">
            <span className="h-7 px-2.5 bg-white text-brand-royal font-black tracking-tighter text-sm rounded flex items-center shadow-sm">
              VietinBank
            </span>
            <span className="font-extrabold text-sm sm:text-base uppercase tracking-wide group-hover:underline">
              BHY one — Cổng thông tin Chi nhánh
            </span>
            <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1">
            Vun Gốc Bền Rễ - Vươn Tầm Tương Lai · Kỷ niệm 20 năm thành lập (2006 - 2026)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {CHIPS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to + label}
              to={to}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold whitespace-nowrap transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
