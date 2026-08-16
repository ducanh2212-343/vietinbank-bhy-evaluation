import React from 'react';
import { NavLink } from 'react-router-dom';
import { ClipboardList, Gavel, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIdeaCouncilAccess } from './council/useIdeaCouncil';

// Khung dùng chung của ba màn Bắc Hưng Yên Ideas.
//
// Vì sao tách ra: trước đây mỗi màn tự dựng phần mở đầu theo một kiểu, nên
// trang Ideas là một trong hai trang ONE không theo khuôn chung (chip → tiêu đề
// in hoa → mô tả) mà các trang Sharing, Tin tức, Sao Xứng Đáng, 3806 đều dùng.
// Gom về một chỗ thì ba màn của cùng thương hiệu trông như một, và sau này đổi
// khuôn chỉ sửa một nơi.

/**
 * Phần mở đầu chuẩn cổng ONE — dùng cho cả ba màn của Ideas.
 *
 * `title` nhận cả chuỗi lẫn nút React để trang chính truyền được ô chữ sửa
 * tại chỗ của quản trị (EditableText) mà vẫn giữ đúng thang chữ chung.
 */
export const IdeaHero: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mx-auto max-w-3xl text-center">
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-800">
      <Lightbulb className="h-4 w-4" />
      Bắc Hưng Yên Ideas
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
  icon: typeof Lightbulb;
  end?: boolean;
  hien: boolean;
}

/**
 * Thanh tab chuyển giữa ba màn của Ideas.
 *
 * Đây là bản sao ở tầng trang của thư mục «Bắc Hưng Yên Ideas» trên thanh điều
 * hướng — cần cả hai vì trên điện thoại menu nằm trong nút «Thêm», chuyển qua
 * lại giữa các màn của cùng một thương hiệu bằng menu thì quá phiền.
 *
 * Mục nào không đủ quyền thì KHÔNG hiện, đúng như menu — không hiện rồi chặn.
 */
export const IdeaTabs: React.FC = () => {
  const { isAdmin, isManager, isPgd } = useAuth();
  const { isMember } = useIdeaCouncilAccess();

  const tabs: MucTab[] = [
    { to: '/one/y-tuong', label: 'Gửi & tra cứu ý tưởng', icon: Lightbulb, end: true, hien: true },
    { to: '/one/y-tuong/hoi-dong', label: 'Chấm điểm Hội đồng', icon: Gavel, hien: isMember || isAdmin },
    { to: '/one/y-tuong/van-hanh', label: 'Vận hành & phê duyệt', icon: ClipboardList, hien: isAdmin || isManager || isPgd },
  ];

  const hienThi = tabs.filter(t => t.hien);
  if (hienThi.length < 2) return null;

  return (
    <nav aria-label="Các màn hình của Bắc Hưng Yên Ideas" className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {hienThi.map(t => (
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
