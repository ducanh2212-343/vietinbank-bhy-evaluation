import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Các đường dẫn khách đối tác (guest) được phép vào — allowlist để fail-closed:
// route mới thêm sau này mặc định KHÔNG mở cho guest.
const GUEST_ALLOWED_PREFIXES = ['/one', '/doi-mat-khau'];

export function isGuestAllowedPath(pathname: string): boolean {
  return GUEST_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

/**
 * Chốt chặn guest: bọc toàn bộ cây route sau đăng nhập. Guest ngoài allowlist
 * bị đưa về /one. RLS phía server vẫn là hàng rào thật — đây là lớp điều hướng.
 */
export function GuestGate() {
  const { isGuest } = useAuth();
  const location = useLocation();
  if (isGuest && !isGuestAllowedPath(location.pathname)) {
    return <Navigate to="/one" replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading, user } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  }
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (!isAdmin) return <Navigate to="/tong-quan" replace />;
  return <Outlet />;
}

/**
 * Allow manager / pgd / admin. Used for staff-listing & evaluation pages
 * where data is row-scoped via RLS to the user's department or block.
 */
export function ManagerOrAboveRoute() {
  const { isAdmin, isManager, isPgd, loading, user } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  }
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (!isAdmin && !isManager && !isPgd) return <Navigate to="/tong-quan" replace />;
  return <Outlet />;
}
