import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * KHUNG ĐẦU MỤC LỚN — khung bo góc viền xanh bao trọn MỘT nhóm lớn của menu.
 *
 * Vì sao phải có: trước đây nhãn nhóm ("Cá nhân", "Quản trị đội ngũ", tên sáu
 * thương hiệu Bắc Hưng Yên Ways) chỉ là chữ hoa 11px màu xám nhạt đặt ngay trên
 * danh sách mục con cỡ 14px — tức là ĐẦU MỤC LỚN lại nhỏ và nhạt hơn chính các
 * mục con của nó. Bảng menu Chiêu thức 3 có 8 nhóm × tới 10 mục vì thế đọc ra
 * một mớ liên kết ngang hàng: cán bộ phải dò từng dòng thay vì nhắm thẳng nhóm.
 *
 * Vì sao là KHUNG chứ không phải chỉ đổi cỡ chữ hay tô nền cho riêng dòng nhãn:
 * bảng menu xếp 3–4 cột, thứ mắt cần trước tiên không phải "chữ nào to hơn" mà
 * là "nhóm này bắt đầu và kết thúc ở đâu". Một đường viền bo góc trả lời đúng
 * câu đó — mục con nằm TRONG khung thì không thể nhặt nhầm sang cột bên cạnh,
 * và sáu thương hiệu Ways hiện ra thành sáu khối đếm được bằng mắt. Cỡ chữ một
 * mình không làm được: hai bậc chỉ cách nhau 2px thì vẫn phải đọc mới phân biệt.
 *
 * Chữ nhãn KHÔNG viết hoa toàn bộ: tiếng Việt viết hoa vẫn giữ dấu nhưng dấu
 * thanh chồng lên dấu mũ ở cỡ nhỏ ("QUẢN TRỊ ĐỘI NGŨ") nên đọc chậm hơn hẳn.
 *
 * Hai tông vì hai loại nền: 'sang' cho bảng menu bung xuống (nền popover sáng),
 * 'toi' cho menu dọc phân hệ (nền navy đặc, ở cả chế độ sáng lẫn tối).
 */
export type TongKhung = 'sang' | 'toi';

/** Lớp cho KHUNG bọc cả nhóm — đặt trên div/li, hoặc trên Link nếu cả khung bấm được. */
export function lopKhungDauMuc(
  tong: TongKhung = 'sang',
  { dangXem = false, bamDuoc = false }: { dangXem?: boolean; bamDuoc?: boolean } = {},
): string {
  return cn(
    'block rounded-2xl border p-1.5 transition-colors duration-fast',
    tong === 'sang'
      ? cn(
          'border-primary/25 bg-primary/[0.04]',
          dangXem && 'border-primary/50 bg-primary/[0.09]',
          bamDuoc && 'hover:border-primary/45 hover:bg-primary/[0.09]',
        )
      : cn(
          'border-white/15 bg-white/[0.05]',
          dangXem && 'border-white/30 bg-white/[0.12]',
          bamDuoc && 'hover:border-white/28 hover:bg-white/[0.1]',
        ),
  );
}

/** Lớp cho DÒNG TIÊU ĐỀ trong khung — dùng cho div, button (thư mục) hoặc Link. */
export function lopTieuDeDauMuc(
  tong: TongKhung = 'sang',
  { bamDuoc = false }: { bamDuoc?: boolean } = {},
): string {
  return cn(
    'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left',
    // 44px là mốc chạm tối thiểu; dòng tiêu đề không bấm được thì không cần cao vậy
    bamDuoc ? 'min-h-[44px] transition-colors duration-fast' : 'min-h-[38px]',
    bamDuoc && (tong === 'sang' ? 'hover:bg-primary/10' : 'hover:bg-white/[0.08]'),
    tong === 'sang'
      ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
  );
}

interface Props {
  icon: LucideIcon;
  nhan: string;
  tong?: TongKhung;
  dangXem?: boolean;
  /** Phần đuôi bên phải: mũi tên «đi tới» hoặc dấu bung/thu của thư mục */
  duoi?: React.ReactNode;
}

/** Ruột dòng tiêu đề: ô biểu tượng bo góc + tên nhóm + phần đuôi tùy chọn. */
export function TieuDeDauMuc({ icon: Icon, nhan, tong = 'sang', dangXem = false, duoi }: Props) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-lg',
          tong === 'sang'
            ? 'bg-primary text-primary-foreground'
            : 'bg-white text-sidebar-primary-foreground',
          !dangXem && tong === 'toi' && 'bg-white/85',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {/*
        Tên nhóm XUỐNG DÒNG chứ không cắt bằng «…». Ở bảng 4 cột mỗi khung chỉ
        rộng ~230px, trừ ô biểu tượng, khoảng đệm và mũi tên thì phần chữ còn
        ~138px — vừa đủ cắt cụt đúng những tên dài nhất và cũng là những tên
        quan trọng nhất ("Bắc Hưng Yên Sharing", "…Connect", "…Credit 360").
        Đầu mục lớn mà phải rê chuột lên mới biết tên đầy đủ thì hỏng mục đích.
        Mục CON vẫn cắt một dòng — chúng nhiều và ngắn, giữ nhịp quét mắt.
      */}
      <span
        className={cn(
          'min-w-0 flex-1 text-balance break-words text-[13.5px] font-bold leading-snug tracking-tight',
          tong === 'sang' ? 'text-primary' : 'text-white',
        )}
      >
        {nhan}
      </span>
      {duoi}
    </>
  );
}
