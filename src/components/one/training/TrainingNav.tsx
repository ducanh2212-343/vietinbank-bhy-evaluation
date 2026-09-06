import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Compass, Columns3, GraduationCap, Route, ScanFace } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OnePageShell } from '@/components/one/OnePageShell';
import { TTC_DINH_VI, TTC_TEN, TTC_TEN_VAI } from '@/lib/trainingCenter';
import { useTtcBoiCanh } from './useTrainingCenter';
import { TtcGioiThieu } from './TtcGioiThieu';

// Khung dùng chung của năm màn Bắc Hưng Yên Training Center — dựng theo đúng
// khuôn IdeaNav.tsx / StarNav.tsx (chip → tiêu đề in hoa → mô tả → thanh tab)
// để thương hiệu mới trông như một với phần còn lại của cổng ONE. Không đổi vỏ,
// không đổi bảng màu: navy của cổng + vàng đồng làm điểm nhấn.

/** Phần mở đầu chuẩn cổng ONE */
export const TtcHero: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mx-auto max-w-3xl text-center">
    <div className="inline-flex items-center gap-2 rounded-full bg-[#A8763E]/15 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#8A5E2C]">
      <GraduationCap className="h-4 w-4" />
      {TTC_TEN}
    </div>
    <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
      {title}
    </h1>
    <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.25em] text-[#A8763E]">{TTC_DINH_VI}</p>
    <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
  </div>
);

interface MucTab {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
}

/**
 * Thanh tab chuyển giữa năm màn — bản sao ở tầng trang của thư mục «Bắc Hưng
 * Yên Training Center» trên thanh điều hướng (trên điện thoại menu nằm trong
 * nút «Thêm»). Chỉ hiện với thành viên chương trình: người ngoài chương trình
 * chỉ có màn giới thiệu, không mời vào cửa đã khóa.
 */
export const TtcTabs: React.FC<{ hien: boolean }> = ({ hien }) => {
  if (!hien) return null;
  const tabs: MucTab[] = [
    { to: '/one/training-center', label: 'Trang chủ', icon: Compass, end: true },
    { to: '/one/training-center/lo-trinh', label: 'Lộ trình', icon: Route },
    { to: '/one/training-center/bang-viec', label: 'Bảng việc', icon: Columns3 },
    { to: '/one/training-center/tu-soi', label: 'Tự soi', icon: ScanFace },
    { to: '/one/training-center/lich-bgd', label: 'Lịch Ban Giám đốc', icon: CalendarDays },
  ];
  return (
    <nav aria-label="Các màn hình của Bắc Hưng Yên Training Center" className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                isActive
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <t.icon className="h-4 w-4 shrink-0" />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

/**
 * Vỏ của mọi màn Training Center: nạp bối cảnh chương trình MỘT lần, dựng hero
 * + tab, rồi giao phần thân cho màn con kèm bối cảnh. Người không thuộc chương
 * trình nào thấy giới thiệu + lời giải thích, không thấy dữ liệu — RLS mới là
 * hàng rào thật, đây là lớp trải nghiệm.
 */
export const TtcKhung: React.FC<{
  title: React.ReactNode;
  moTa: React.ReactNode;
  children: (bc: ReturnType<typeof useTtcBoiCanh>) => React.ReactNode;
}> = ({ title, moTa, children }) => {
  const bc = useTtcBoiCanh();
  const laThanhVien = !!bc.chuongTrinh && !!bc.vai;

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <TtcHero title={title}>{moTa}</TtcHero>
        <TtcTabs hien={laThanhVien} />

        {bc.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : bc.isError ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Chưa đọc được dữ liệu Training Center. Có thể cấu phần chưa được cài lên hệ thống — Phòng Tổng hợp kiểm tra giúp.
          </p>
        ) : laThanhVien ? (
          <>
            <p className="text-center text-xs text-slate-500">
              {bc.chuongTrinh!.ten} · Vai của anh/chị: <b className="text-brand-navy">{TTC_TEN_VAI[bc.vai!]}</b>
            </p>
            {children(bc)}
          </>
        ) : (
          <>
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
              Anh/chị chưa thuộc chương trình đào tạo nào trên Training Center. Khi được xếp vào một chương trình,
              lộ trình, bảng việc và phiếu tự soi sẽ hiện ở đây.
            </p>
            <TtcGioiThieu />
          </>
        )}
      </section>
    </OnePageShell>
  );
};
