import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissionReportAccess } from '@/hooks/useSubmissionReportAccess';
import { useStrategicHrAccess } from '@/hooks/useStrategicHrAccess';
import { useCouncilAccess } from '@/hooks/useCouncilAccess';
import {
  NAV_SECTIONS,
  filterSections,
  flattenLeaves,
  resolveLocation,
  type NavPermissions,
  type NavSection,
  type NavLocation,
  type NavLeaf,
  type NavFolder,
} from '@/lib/navigation';

/**
 * Cây điều hướng đã lọc theo quyền, tính MỘT lần cho cả ứng dụng.
 *
 * Trước đây sidebar bản desktop và sidebar bản trong ngăn kéo cùng mount, mỗi
 * bản tự gọi 3 hook phân quyền — mỗi lần mở ngăn kéo là thêm một loạt truy vấn
 * Supabase. Nay 4 bề mặt điều hướng (thanh ngang, menu dọc, thanh tab điện
 * thoại, bảng lệnh ⌘K) cùng đọc từ một Context duy nhất.
 */
export interface NavTree {
  /** Các khu người dùng hiện tại được thấy */
  sections: NavSection[];
  /** Mọi mục lá đã trải phẳng — dùng cho bảng lệnh ⌘K */
  leaves: Array<{ leaf: NavLeaf; section: NavSection; folder?: NavFolder }>;
  /** Vị trí của trang đang xem trong cây */
  location: NavLocation;
  /** Còn đang tra quyền — dùng để tránh chớp menu thiếu mục */
  loading: boolean;
}

const NavTreeContext = createContext<NavTree | null>(null);

export function NavTreeProvider({ children }: { children: ReactNode }) {
  const { isAdmin, isManager, isPgd, isGuest, guestScreens, roles } = useAuth();
  const reportAccess = useSubmissionReportAccess();
  const strategicAccess = useStrategicHrAccess();
  const councilAccess = useCouncilAccess();
  const { pathname } = useLocation();

  // Quản trị/tổng hợp Hội đồng đầu mối: chỉ Giám đốc Chi nhánh + TCTH/System admin.
  // Phó Giám đốc (role 'bgd' nhưng không phải Giám đốc) là user quản lý, không có
  // quyền tổng hợp toàn chi nhánh.
  const isFullCouncilAdmin =
    roles.includes('tcth_admin') || roles.includes('system_admin') || councilAccess.memberGroup === 'giam_doc';

  const permissions = useMemo<NavPermissions>(
    () => ({
      isGuest,
      // Khách đối tác: menu dựng theo đúng danh sách màn hình Phòng TCTH mở cho
      // tài khoản đó (guest_access.allowed_screens)
      guestScreens,
      isAdmin,
      isManager,
      isPgd,
      submissionReport: reportAccess.allowed,
      strategicHr: strategicAccess.allowed,
      councilMember: councilAccess.isMember,
      councilReport: isAdmin || councilAccess.isSubject || councilAccess.isSupervisor,
      councilAnalytics: isFullCouncilAdmin,
      leadershipMarks: isAdmin || isPgd,
    }),
    [
      isGuest, guestScreens, isAdmin, isManager, isPgd,
      reportAccess.allowed, strategicAccess.allowed,
      councilAccess.isMember, councilAccess.isSubject, councilAccess.isSupervisor,
      isFullCouncilAdmin,
    ],
  );

  // Lọc cây và trải phẳng CHỈ phụ thuộc quyền, không phụ thuộc trang đang xem —
  // tách riêng để mỗi lần đổi trang không phải duyệt lại cả 60 mục.
  const sections = useMemo(() => filterSections(NAV_SECTIONS, permissions), [permissions]);
  const leaves = useMemo(() => flattenLeaves(sections), [sections]);

  const value = useMemo<NavTree>(
    () => ({
      sections,
      leaves,
      // Tra vị trí trên cây ĐÃ LỌC: trang ngoài quyền sẽ không dựng breadcrumb sai
      location: resolveLocation(pathname, sections),
      loading: reportAccess.loading || strategicAccess.loading || councilAccess.loading,
    }),
    [sections, leaves, pathname, reportAccess.loading, strategicAccess.loading, councilAccess.loading],
  );

  return <NavTreeContext.Provider value={value}>{children}</NavTreeContext.Provider>;
}

export function useNavTree(): NavTree {
  const ctx = useContext(NavTreeContext);
  if (!ctx) throw new Error('useNavTree phải nằm trong <NavTreeProvider>');
  return ctx;
}
