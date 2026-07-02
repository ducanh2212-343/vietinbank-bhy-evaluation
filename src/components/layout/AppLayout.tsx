import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Search, Menu, X, LogOut, User, ChevronDown, KeyRound } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function AppLayout() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roleLabel: Record<string, string> = {
    bgd: 'Ban Giám đốc', tcth_admin: 'TCTH Admin', system_admin: 'System Admin',
    manager: 'Trưởng phòng', pgd: 'Phó Giám đốc', employee: 'Nhân viên',
  };

  const displayRole = roles.length > 0 ? roleLabel[roles[0]] || roles[0] : '';

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    // h-dvh: đúng chiều cao khả dụng trên mobile (thanh địa chỉ iOS/Android); h-screen là fallback
    <div className="flex h-screen h-dvh w-full overflow-hidden">
      {/* Desktop/tablet ngang (≥1024px): sidebar cố định; nhỏ hơn dùng drawer */}
      <div className="hidden lg:block h-screen h-dvh sticky top-0">
        <AppSidebar />
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[85vw] max-w-xs h-full animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-sidebar-accent text-sidebar-primary"
            >
              <X className="w-4 h-4" />
            </button>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 glass-strong flex items-center justify-between px-3 sm:px-6 flex-shrink-0 border-x-0 border-t-0 rounded-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
              className="lg:hidden p-2.5 -ml-1 rounded-xl hover:bg-muted active:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-40 sm:w-72 hidden sm:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm kiếm..." aria-label="Tìm kiếm" className="pl-9 h-9 text-sm rounded-full bg-white/60 border-white/70" />
            </div>
          </div>

          {/* User menu */}
          <div className="relative min-w-0" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 sm:gap-3 text-sm hover:bg-white/60 rounded-full px-2 py-1.5 transition-colors min-w-0"
            >
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-medium whitespace-nowrap">{displayRole}</span>
              <span className="font-medium text-xs sm:text-sm truncate max-w-[110px] sm:max-w-[200px]">{user?.email}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 glass-strong rounded-2xl shadow-lift z-50 py-1.5">
                <button
                  onClick={() => { navigate('/ho-so-ca-nhan'); setUserMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  Hồ sơ cá nhân
                </button>
                <button
                  onClick={() => { navigate('/doi-mat-khau'); setUserMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  Đổi mật khẩu
                </button>
                <div className="border-t my-1" />
                <button
                  onClick={() => { signOut(); setUserMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto safe-bottom">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
