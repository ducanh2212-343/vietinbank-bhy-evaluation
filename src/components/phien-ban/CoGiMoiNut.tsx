// Nút «Có gì mới» trên thanh điều hướng — chấm đỏ khi hệ thống vừa lên tính năng.
//
// Đặt cạnh chuông thông báo chứ không nhét sâu trong menu: thứ mà cán bộ không
// biết là nó tồn tại thì có nằm trong menu cũng như không. Chấm đỏ tắt ngay khi
// mở trang, không phải bấm nút «đã đọc» thứ hai.
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { usePhienBanMoi } from '@/hooks/usePhienBanMoi';

export function CoGiMoiNut() {
  const { soChuaXem } = usePhienBanMoi();

  return (
    <Link
      to="/co-gi-moi"
      aria-label={soChuaXem > 0 ? `Có gì mới — ${soChuaXem} cập nhật chưa xem` : 'Có gì mới'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
    >
      <Sparkles className="h-[18px] w-[18px]" />
      {soChuaXem > 0 && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground"
        >
          {soChuaXem > 9 ? '9+' : soChuaXem}
        </span>
      )}
    </Link>
  );
}
