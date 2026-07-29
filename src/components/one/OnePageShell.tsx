import React from 'react';
import { AdminEditableProvider } from './AdminEditableContext';
import { BackgroundDecor } from './BackgroundDecor';
import { OneSectionNav } from './OneSectionNav';
import { Footer } from './Footer';

// Vỏ chung của cổng BHY one: "đảo sáng" cố định nền sáng (thiết kế gốc là trang sáng),
// nền trang + decor + nav mục + footer. Mọi trang /one bọc trong shell này.
export const OnePageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AdminEditableProvider>
      {/* Bù đúng padding p-3 sm:p-6 của AppLayout để cổng chiếm trọn khung nhìn */}
      <div className="relative min-h-full -m-3 sm:-m-6 flex flex-col bg-[#F4F7FA] font-sans text-slate-800 selection:bg-brand-royal selection:text-white">
        <BackgroundDecor />
        <OneSectionNav />
        <main className="flex-1 flex flex-col relative z-10">{children}</main>
        <Footer />
      </div>
    </AdminEditableProvider>
  );
};
