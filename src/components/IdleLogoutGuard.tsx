import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Tự đăng xuất khi không thao tác quá IDLE_LIMIT_MS (chuẩn nội bộ: 60 phút).
// - Mọi thao tác chuột/bàn phím/cuộn/chạm đều tính là "đang hoạt động".
// - Mốc hoạt động lưu ở localStorage nên nhiều tab dùng chung: thao tác ở tab
//   này giữ phiên cho tab kia; đăng xuất ở một tab lan sang các tab còn lại
//   (supabase-js phát sự kiện SIGNED_OUT qua storage).
// - Cảnh báo trước 1 phút để người dùng kịp giữ phiên (chỉ cần động chuột).
const IDLE_LIMIT_MS = 60 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const TOUCH_THROTTLE_MS = 5 * 1000;
const LAST_ACTIVITY_KEY = '343skill:last-activity';

export function IdleLogoutGuard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const lastTouchWrite = useRef(0);
  const warned = useRef(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (!user) return;

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    warned.current = false;
    loggingOut.current = false;

    const touch = () => {
      const now = Date.now();
      if (now - lastTouchWrite.current < TOUCH_THROTTLE_MS) return;
      lastTouchWrite.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      warned.current = false;
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const interval = setInterval(() => {
      if (loggingOut.current) return;
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
      const idle = Date.now() - last;

      if (idle >= IDLE_LIMIT_MS) {
        loggingOut.current = true;
        toast({
          title: 'Đã đăng xuất do không hoạt động',
          description: 'Bạn không thao tác quá 60 phút. Vui lòng đăng nhập lại.',
          variant: 'destructive',
        });
        void signOut();
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
      clearInterval(interval);
    };
  }, [user, signOut, toast]);

  return null;
}
