import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavTreeProvider, useNavTree } from '@/hooks/useNavTree';
import { TopNav } from './TopNav';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { MobileNav } from './MobileNav';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, usePhimTatBangLenh, useGhiNhoTrangGanDay } from './CommandPalette';
import { cn } from '@/lib/utils';

/**
 * Khung ứng dụng sau đăng nhập.
 *
 * Điều hướng hai tầng theo sơ đồ site đã duyệt:
 *  - Tầng 1: thanh ngang BHY ONE, hiện ở MỌI trang.
 *  - Tầng 2: menu dọc, CHỈ hiện khi đang trong phân hệ chuyên sâu ('workspace').
 * Nhờ vậy cổng ONE không còn cảnh hai hệ menu liệt kê cùng một nội dung.
 *
 * Cuộn ở cấp tài liệu (không phải khung con overflow-y-auto như bản cũ) để thanh
 * địa chỉ trên trình duyệt di động tự thu lại và trình duyệt khôi phục đúng vị
 * trí cuộn khi bấm nút quay lui.
 */
function KhungUngDung() {
  const { location: viTri } = useNavTree();
  const { pathname } = useLocation();
  const [moBangLenh, setMoBangLenh] = useState(false);
  const noiDungRef = useRef<HTMLElement>(null);
  const lanDau = useRef(true);

  usePhimTatBangLenh(setMoBangLenh);

  // Chỉ ghi nhớ trang có mặt trên cây điều hướng
  const duongDanHopLe = useCallback(() => !!viTri.leaf, [viTri.leaf]);
  useGhiNhoTrangGanDay(duongDanHopLe);

  // Đổi trang: đưa tiêu điểm về vùng nội dung để người dùng bàn phím và trình
  // đọc màn hình không phải tab lại từ đầu thanh điều hướng.
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    noiDungRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const laKhuLamViec = viTri.zone === 'workspace';
  // Trang tràn viền (bọc trong OnePageShell) tự lo khoảng đệm và nền riêng.
  // Mặc định là KHÔNG tràn viền, nên route lạ hay trang mới quên khai báo vẫn
  // nhận khoảng đệm chuẩn thay vì dính sát mép màn hình.
  const traVien = !!viTri.leaf?.bleed;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Lối tắt bỏ qua điều hướng — chỉ hiện khi được tab tới */}
      <a
        href="#noi-dung-chinh"
        className={cn(
          'sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-overlay',
          'focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium',
          'focus:text-primary-foreground focus:shadow-menu focus:outline-none',
        )}
      >
        Bỏ qua tới nội dung chính
      </a>

      <TopNav onMoBangLenh={() => setMoBangLenh(true)} />

      <div className="flex min-w-0 flex-1">
        {laKhuLamViec && <WorkspaceSidebar />}

        <main
          id="noi-dung-chinh"
          ref={noiDungRef}
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 outline-none',
            // Chừa chỗ cho thanh tab dưới đáy trên điện thoại
            'pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0',
            // Mọi trang đều nhận khoảng đệm chung, TRỪ trang tự dựng bố cục
            // tràn viền (các trang bọc trong OnePageShell có dải hero + nền riêng).
            !traVien && 'px-3 pt-4 sm:px-6 sm:pt-5',
          )}
        >
          {laKhuLamViec && <Breadcrumbs />}
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <CommandPalette open={moBangLenh} onOpenChange={setMoBangLenh} />
    </div>
  );
}

export function AppLayout() {
  return (
    <NavTreeProvider>
      <KhungUngDung />
    </NavTreeProvider>
  );
}
