import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Boxes, Compass, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Khung dùng chung của các màn Sao Xứng Đáng — dựng theo đúng khuôn
// IdeaNav.tsx của Bắc Hưng Yên Ideas để hai thương hiệu trông như một.
//
// VÌ SAO TÁCH: trước đây cả chương trình nằm gọn trong MỘT trang — giới thiệu,
// ô tặng sao, bảng thi đua, và cả khu quản lý kho sao của Phòng TCTH nối đuôi
// nhau. Cán bộ muốn xem sao của mình phải cuộn qua khu quản trị; TCTH muốn bàn
// giao phải cuộn hết phần giới thiệu. Tách theo việc, mỗi việc một cửa — cùng
// nguyên tắc «một chức năng một cửa» mà Ideas đang theo.

/** Phần mở đầu chuẩn cổng ONE — dùng cho cả bốn màn của Sao Xứng Đáng */
export const StarHero: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mx-auto max-w-3xl text-center">
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-800">
      <Star className="h-4 w-4 fill-amber-500 text-amber-600" />
      Ghi nhận &amp; Lan tỏa
    </div>
    <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
      {title}
    </h1>
    <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
  </div>
);

interface MucTab {
  to: string;
  label: string;
  icon: typeof Star;
  end?: boolean;
  hien: boolean;
}

/**
 * Thanh tab chuyển giữa các màn của Sao Xứng Đáng.
 *
 * Bản sao ở tầng trang của thư mục «Sao Xứng Đáng» trên thanh điều hướng — cần
 * cả hai vì trên điện thoại menu nằm trong nút «Thêm».
 *
 * Khách đối tác chỉ được vào màn giới thiệu (`manHinhKhach.ts` khớp đường dẫn
 * CHÍNH XÁC nên các đường con tự đóng) — với khách thì không hiện thanh tab,
 * tránh mời vào cửa đã khóa.
 */
export const StarTabs: React.FC = () => {
  const { isGuest, roles } = useAuth();
  const laTcth = roles.includes('tcth_admin') || roles.includes('system_admin');

  if (isGuest) return null;

  const tabs: MucTab[] = [
    { to: '/one/ghi-nhan', label: 'Giới thiệu chương trình', icon: Compass, end: true, hien: true },
    { to: '/one/ghi-nhan/tang-sao', label: 'Ghi nhận Sao', icon: Star, hien: true },
    { to: '/one/ghi-nhan/tong-hop', label: 'Bảng tổng hợp & thi đua', icon: BarChart3, hien: true },
    { to: '/one/ghi-nhan/quan-ly', label: 'Quản lý & bàn giao (TCTH)', icon: Boxes, hien: laTcth },
  ];

  const hienThi = tabs.filter((t) => t.hien);
  if (hienThi.length < 2) return null;

  return (
    <nav aria-label="Các màn hình của Sao Xứng Đáng" className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {hienThi.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
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
