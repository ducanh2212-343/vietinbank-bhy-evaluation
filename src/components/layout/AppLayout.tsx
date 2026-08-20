import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { NavTreeProvider, useNavTree } from '@/hooks/useNavTree';
import { useLichNghi } from '@/hooks/useLichNghi';
import { useCauHinhNhip } from '@/hooks/useCauHinhNhip';
import { TopNav } from './TopNav';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { MobileNav } from './MobileNav';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, usePhimTatBangLenh, useGhiNhoTrangGanDay } from './CommandPalette';
import { cn } from '@/lib/utils';
import { QuickNoteFab } from '@/components/behavior/QuickNoteFab';
import { CoGiMoiHopThoai } from '@/components/phien-ban/CoGiMoiHopThoai';

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
  const kieuDieuHuong = useNavigationType();
  const [moBangLenh, setMoBangLenh] = useState(false);
  const noiDungRef = useRef<HTMLElement>(null);
  const lanDau = useRef(true);

  usePhimTatBangLenh(setMoBangLenh);

  // Nạp lịch nghỉ lễ một lần cho cả phiên: mọi phép đếm ngày làm việc phía
  // client (tuổi chờ thẻ, tuổi chờ hồ sơ, số ngày im lặng) đọc từ sổ này.
  useLichNghi();
  useCauHinhNhip();

  // Chỉ ghi nhớ trang có mặt trên cây điều hướng
  useGhiNhoTrangGanDay(viTri.leaf?.path);

  // Đổi trang: cuộn về đầu và đưa tiêu điểm về vùng nội dung.
  //
  // Cuộn: mở trang mới phải bắt đầu từ đầu trang. Riêng thao tác lùi/tiến trên
  // trình duyệt (POP) thì để nguyên — trình duyệt tự khôi phục đúng chỗ người
  // dùng đang đọc, ép về đầu sẽ làm mất vị trí đó.
  //
  // Tiêu điểm: đặt vào vùng nội dung để người dùng bàn phím và trình đọc màn hình
  // không phải tab lại từ đầu thanh điều hướng. preventScroll để bước này không
  // kéo màn hình đi đâu khác.
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    if (kieuDieuHuong !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    noiDungRef.current?.focus({ preventScroll: true });
  }, [pathname, kieuDieuHuong]);

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
            // Khoảng đệm dưới ở md trở lên: dưới md đã có sẵn phần chừa cho thanh tab.
            !traVien && 'px-3 pt-4 sm:px-6 sm:pt-5 md:pb-8',
          )}
        >
          {laKhuLamViec && <Breadcrumbs />}
          <Outlet />
        </main>
        {/* Nút nổi Ghi nhanh hành vi — tự ẩn với người không có quyền ghi */}
        <QuickNoteFab />
        {/* Hộp «Có gì mới» sau mỗi đợt cập nhật đáng kể — tự im với bản sửa lỗi */}
        <CoGiMoiHopThoai />
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
