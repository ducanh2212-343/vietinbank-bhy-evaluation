import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  LAST_ACTIVITY_KEY, IDLE_LIMIT_MS, markActivity, clearActivity, isIdleExpired,
} from '@/lib/idleSession';

// Tự đăng xuất khi không thao tác quá IDLE_LIMIT_MS (chuẩn nội bộ: 60 phút).
// - Mọi thao tác chuột/bàn phím/cuộn/chạm đều tính là "đang hoạt động".
// - Mốc hoạt động lưu ở localStorage nên nhiều tab dùng chung: thao tác ở tab
//   này giữ phiên cho tab kia; đăng xuất ở một tab lan sang các tab còn lại
//   (supabase-js phát sự kiện SIGNED_OUT qua storage).
// - QUAN TRỌNG: khi mở lại app/tải lại trang, KIỂM TRA mốc cũ TRƯỚC khi đặt mốc mới —
//   nếu đã vắng quá 60 phút (kể cả lúc app đóng) thì đăng xuất ngay. Trước đây mốc bị
//   ghi đè = hiện tại mỗi lần khởi tạo nên đóng app 1 tiếng rồi mở lại vẫn vào được.
// - Cảnh báo trước 1 phút để người dùng kịp giữ phiên (chỉ cần động chuột).
const WARN_BEFORE_MS = 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const TOUCH_THROTTLE_MS = 5 * 1000;

export function IdleLogoutGuard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const lastTouchWrite = useRef(0);
  const warned = useRef(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (!user) return;

    warned.current = false;
    loggingOut.current = false;

    const logoutIdle = () => {
      loggingOut.current = true;
      clearActivity();
      toast({
        title: 'Đã đăng xuất do không hoạt động',
        description: 'Bạn không thao tác quá 60 phút. Vui lòng đăng nhập lại.',
        variant: 'destructive',
      });
      void signOut();
    };

    // Khi vào lại app: đã vắng quá hạn (app đóng lâu) → đăng xuất ngay, không reset đồng hồ.
    if (isIdleExpired()) {
      logoutIdle();
      return;
    }
    // Phiên đang hoạt động (hoặc mới đăng nhập): đặt mốc bây giờ.
    markActivity();

    const touch = () => {
      const now = Date.now();
      if (now - lastTouchWrite.current < TOUCH_THROTTLE_MS) return;
      lastTouchWrite.current = now;
      markActivity(now);
      warned.current = false;
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    // Khi tab được focus lại (chuyển tab / mở lại PWA mà không remount): kiểm tra ngay,
    // không đợi tới nhịp interval kế tiếp — vì interval bị trình duyệt bóp khi tab nền.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !loggingOut.current && isIdleExpired()) {
        logoutIdle();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const interval = setInterval(() => {
      if (loggingOut.current) return;
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
      const idle = Date.now() - last;

      if (idle >= IDLE_LIMIT_MS) {
        logoutIdle();
        return;
      }

      if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS && !warned.current) {
        warned.current = true;
        toast({
          title: 'Phiên sắp hết hạn',
          description: 'Bạn sắp bị đăng xuất do không hoạt động. Di chuyển chuột hoặc gõ phím để tiếp tục làm việc.',
        });
      }
    }, CHECK_EVERY_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [user, signOut, toast]);

  return null;
}
