import React from 'react';
import { AdminEditableProvider } from './AdminEditableContext';
import { BackgroundDecor } from './BackgroundDecor';
import { Footer } from './Footer';
import { useAuth } from '@/hooks/useAuth';

// Dải nhắc hạn truy cập cho khách đối tác
function GuestBanner() {
  const { isGuest, guestExpiresAt } = useAuth();
  if (!isGuest || !guestExpiresAt) return null;
  const d = new Date(guestExpiresAt);
  return (
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">
      Tài khoản khách — được chia sẻ nội dung đến hết ngày {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()}
    </div>
  );
}

/**
 * Vỏ chung của cổng BHY ONE.
 *
 * Điều hướng KHÔNG còn ở đây: thanh ngang BHY ONE đã lên khung ứng dụng
 * (AppLayout) nên nó hiện ở mọi trang, đúng nguyên tắc "một cổng, không phải hai
 * website". Trước đây shell tự dựng <OneSectionNav/> bên trong <main> của khung,
 * sinh ra hai hệ menu chồng nhau và hai landmark <main> lồng nhau.
 *
 * `one-light` giữ cổng ở hệ màu sáng — đây là chủ ý thiết kế gốc ("đảo sáng"):
 * các trang cổng dùng bảng màu sáng cố định, nên ép token về hệ sáng để thành
 * phần dùng chung (Card, Dialog, Tabs…) không vỡ khi ứng dụng đang ở chế độ tối.
 */
export const OnePageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /*
   * Đảo sáng ở trên chỉ phủ các nút nằm trong cây DOM của shell. Dialog, Select,
   * Popover, Sheet của Radix lại render qua portal ra thẳng <body> nên rơi ra
   * ngoài đảo: ở chế độ tối chúng lấy token nền tối trong khi ruột của chúng vẫn
   * là bảng màu sáng cố định, thành ra chữ tối trên nền tối. Gắn cờ lên <body>
   * để quy tắc `body.one-portal-light > *:not(#root)` trong index.css kéo các
   * lớp nổi ấy về hệ sáng suốt thời gian người dùng ở trong cổng.
   */
  React.useEffect(() => {
    document.body.classList.add('one-portal-light');
    return () => document.body.classList.remove('one-portal-light');
  }, []);

  return (
    <AdminEditableProvider>
      {/* Cao tối thiểu = khung nhìn trừ thanh điều hướng 56px, để chân trang
          luôn nằm dưới đáy màn hình kể cả trang ít nội dung */}
      <div className="one-light relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#F4F7FA] font-sans text-slate-800 selection:bg-brand-royal selection:text-white">
        <BackgroundDecor />
        <GuestBanner />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
        <Footer />
      </div>
    </AdminEditableProvider>
  );
};
