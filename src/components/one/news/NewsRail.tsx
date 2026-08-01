import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Newspaper, Pin, ThumbsUp } from 'lucide-react';
import { CATEGORY_NAMES, type UploadedItem } from '@/data/one/types';
import { nhanThoiGian, tinTrangChu } from '@/lib/tinTuc';
import { cn } from '@/lib/utils';

/**
 * TIN TỨC NỘI BỘ trên Trang chủ — thẻ DỰNG ĐỨNG, dải TRƯỢT NGANG.
 *
 * Vì sao không xếp lưới: dòng tin là phần dài nhất của cổng. Xếp lưới dọc thì 12
 * tin đã đẩy toàn bộ phần bản sắc và hệ sinh thái xuống dưới hai màn hình cuộn.
 * Dải trượt ngang giữ tin ở đúng một tầm mắt: cao bằng một thẻ, dài bao nhiêu
 * tùy số tin, và người đọc chủ động lướt tiếp chứ không bị đổ hết vào mặt.
 *
 * Điện thoại vuốt ngang là thao tác quen; máy tính có thêm hai nút mũi tên vì
 * chuột không vuốt ngang được. Nút chỉ hiện khi thật sự còn chỗ để trượt.
 */

const RONG_THE = 264; // px — khớp w-[264px] của thẻ

function TheTin({ item, homNay }: { item: UploadedItem; homNay: Date }) {
  return (
    <Link
      to={`/one/tin-tuc?tin=${item.id}`}
      className={cn(
        'group flex w-[264px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200',
        'bg-white shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal',
      )}
    >
      <div className="relative h-36 shrink-0 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-slate-300">
            <Newspaper className="h-10 w-10" />
          </span>
        )}
        {item.isFeatured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-2xs font-bold text-white shadow">
            <Pin className="h-3 w-3" />
            Ghim
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Cắt một dòng: tên chuyên mục dài nhất ("Bắc Hưng Yên Connect & Thư
            viện") xuống hai dòng sẽ đẩy tiêu đề lệch so với các thẻ bên cạnh */}
        <span className="block truncate text-2xs font-bold uppercase tracking-wider text-brand-royal">
          {CATEGORY_NAMES[item.category] || item.category}
        </span>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-800">{item.title}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-600">{item.summary}</p>
        <div className="mt-3 flex items-center gap-3 text-2xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {nhanThoiGian(item.date, homNay)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {item.likes}
          </span>
          <span className="ml-auto truncate">{item.department}</span>
        </div>
      </div>
    </Link>
  );
}

export function NewsRail({ items }: { items: UploadedItem[] }) {
  const daiRef = useRef<HTMLDivElement>(null);
  const [truotDuoc, setTruotDuoc] = useState({ trai: false, phai: false });
  const tin = tinTrangChu(items);
  // Mốc "hôm nay" tính một lần khi dựng: gọi new Date() trong lúc render mỗi thẻ
  // sẽ cho các thẻ mốc lệch nhau vài ms và làm React render lại vô ích.
  const [homNay] = useState(() => new Date());

  const doTrangThai = useCallback(() => {
    const el = daiRef.current;
    if (!el) return;
    setTruotDuoc({
      trai: el.scrollLeft > 8,
      phai: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    doTrangThai();
    if (typeof ResizeObserver === 'undefined') return;
    const el = daiRef.current;
    if (!el) return;
    const ro = new ResizeObserver(doTrangThai);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doTrangThai, tin.length]);

  const truot = (huong: -1 | 1) => {
    const el = daiRef.current;
    if (!el) return;
    // Trượt trọn số thẻ vừa khung thay vì trượt đúng một khung: trượt lẻ nửa thẻ
    // khiến thẻ bị cắt đôi ở mép, nhìn như hỏng bố cục
    const soThe = Math.max(1, Math.floor(el.clientWidth / RONG_THE));
    el.scrollBy({ left: huong * soThe * RONG_THE, behavior: 'smooth' });
  };

  if (tin.length === 0) return null;

  return (
    <section aria-labelledby="tieu-de-tin-tuc" className="mx-auto w-full max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="tieu-de-tin-tuc" className="flex items-center gap-2 text-2xl font-bold uppercase tracking-tight text-brand-navy">
            <Newspaper className="h-5 w-5 text-brand-royal" />
            Tin tức nội bộ
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Hoạt động, kinh nghiệm và thông báo mới nhất của Chi nhánh — vuốt ngang để xem tiếp.
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => truot(-1)}
            disabled={!truotDuoc.trai}
            aria-label="Xem các tin trước đó"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors duration-fast hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => truot(1)}
            disabled={!truotDuoc.phai}
            aria-label="Xem các tin tiếp theo"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors duration-fast hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/*
        Dải trượt tràn ra sát mép màn hình trên điện thoại (-mx-4 + px-4) để thẻ
        cuối lộ một nửa — tín hiệu "còn nữa, vuốt tiếp" rõ hơn mọi mũi tên.
        tabIndex=0 để bàn phím cũng cuộn được bằng phím mũi tên.
      */}
      <div
        ref={daiRef}
        onScroll={doTrangThai}
        tabIndex={0}
        role="group"
        aria-label="Dải tin tức nội bộ"
        className={cn(
          '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:px-0',
          'scrollbar-none scroll-smooth overscroll-x-contain',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal focus-visible:ring-offset-2',
        )}
      >
        {tin.map((item) => (
          <TheTin key={item.id} item={item} homNay={homNay} />
        ))}

        {/* Thẻ cuối dẫn sang danh sách đầy đủ — vuốt tới cuối là gặp lối đi tiếp */}
        <Link
          to="/one/tin-tuc"
          className="group grid w-[264px] shrink-0 snap-start place-items-center rounded-2xl border border-dashed border-brand-navy/30 bg-brand-navy/[0.03] text-center transition-colors duration-fast hover:bg-brand-navy/[0.07]"
        >
          <span className="p-6">
            <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-brand-navy/10 text-brand-navy">
              <ArrowRight className="h-5 w-5 transition-transform duration-fast group-hover:translate-x-0.5" />
            </span>
            <span className="block text-sm font-bold text-brand-navy">Xem tất cả tin tức</span>
            <span className="mt-1 block text-xs text-slate-500">Toàn bộ dòng tin của Chi nhánh</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
