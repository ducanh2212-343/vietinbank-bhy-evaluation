import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lienDangNhap } from '@/lib/dieuHuongDangNhap';
import { khachXemDuoc } from '@/lib/manHinhKhach';

/**
 * Khách đối tác chỉ vào được các màn hình Phòng TCTH mở cho ĐÚNG tài khoản đó
 * (guest_access.allowed_screens). Allowlist so khớp chính xác nên vẫn fail-closed:
 * route mới thêm sau này chưa vào danh mục là chưa ai vào được.
 */
export function isGuestAllowedPath(pathname: string, guestScreens: readonly string[]): boolean {
  // '/one/' và '/one' là một trang; bỏ dấu gạch cuối trước khi so khớp
  const duongDan = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return khachXemDuoc(duongDan, guestScreens);
}

/**
 * Chốt chặn guest: bọc toàn bộ cây route sau đăng nhập. Guest ngoài allowlist
 * bị đưa về /one. RLS phía server vẫn là hàng rào thật — đây là lớp điều hướng.
 */
export function GuestGate() {
  const { isGuest, guestScreens, loading } = useAuth();
  const location = useLocation();
  // Danh sách màn hình về cùng lúc với vai trò; chặn sớm khi chưa tra xong sẽ
  // đá khách về /one rồi mới biết họ được vào trang vừa bấm.
  if (loading) return <Outlet />;
  if (isGuest && !isGuestAllowedPath(location.pathname, guestScreens)) {
    return <Navigate to="/one" replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading, user } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  }
  // Giữ đích đến như ProtectedRoutes — link sâu vào trang quản trị gửi qua chat/email
  // cũng phải sống sót qua cửa đăng nhập.
  if (!user) return <Navigate to={lienDangNhap(location)} replace />;
  if (!isAdmin) return <Navigate to="/tong-quan" replace />;
  return <Outlet />;
}

/**
 * Allow manager / pgd / admin. Used for staff-listing & evaluation pages
 * where data is row-scoped via RLS to the user's department or block.
 */
export function ManagerOrAboveRoute() {
  const { isAdmin, isManager, isPgd, loading, user } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  }
  if (!user) return <Navigate to={lienDangNhap(location)} replace />;
  if (!isAdmin && !isManager && !isPgd) return <Navigate to="/tong-quan" replace />;
  return <Outlet />;
}
