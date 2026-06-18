import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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
