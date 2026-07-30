import React from 'react';
import { AdminEditableProvider } from './AdminEditableContext';
import { BackgroundDecor } from './BackgroundDecor';
import { OneSectionNav } from './OneSectionNav';
import { Footer } from './Footer';
import { useAuth } from '@/hooks/useAuth';

// Dải nhắc hạn truy cập cho khách đối tác
function GuestBanner() {
  const { isGuest, guestExpiresAt } = useAuth();
  if (!isGuest || !guestExpiresAt) return null;
  const d = new Date(guestExpiresAt);
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-semibold text-center py-1.5 px-4">
      Tài khoản khách — được chia sẻ nội dung đến hết ngày {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()}
    </div>
  );
}

// Vỏ chung của cổng BHY one: "đảo sáng" cố định nền sáng (thiết kế gốc là trang sáng),
// nền trang + decor + nav mục + footer. Mọi trang /one bọc trong shell này.
export const OnePageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AdminEditableProvider>
      {/* Bù đúng padding p-3 sm:p-6 của AppLayout để cổng chiếm trọn khung nhìn */}
      <div className="relative min-h-full -m-3 sm:-m-6 flex flex-col bg-[#F4F7FA] font-sans text-slate-800 selection:bg-brand-royal selection:text-white">
        <BackgroundDecor />
        <GuestBanner />
        <OneSectionNav />
        <main className="flex-1 flex flex-col relative z-10">{children}</main>
        <Footer />
      </div>
    </AdminEditableProvider>
  );
};
