import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BHY_WAYS } from '@/data/one/bhyWays';
import { cn } from '@/lib/utils';
import { usePillarImages } from './PillarGallery';
import { SharingPillar } from './SharingPillar';
import { QuizziPillar } from './QuizziPillar';
import { IdeasPillar } from './IdeasPillar';
import { ConnectPillar } from './ConnectPillar';
import { SaoXungDangPillar } from './SaoXungDangPillar';
import { Credit360Pillar } from './Credit360Pillar';

/** Khóa ảnh trong bảng portal_images (slot 'pillar.<id>') của từng thương hiệu. */
const SLOT_ANH: Record<string, string> = {
  sharing: 'sharing',
  quizzi: 'quizzi',
  ideas: 'ideas',
  connect: 'connect',
  'sao-xung-dang': 'sao',
  'credit-360': 'credit360',
};

interface Props {
  onOpenUploadModal: (cat: string) => void;
}

/**
 * Sáu tab con của Bắc Hưng Yên Ways.
 *
 * Ngôn ngữ thị giác cố ý KHÁC tab mẹ trên thanh điều hướng: tab mẹ là chữ đậm
 * trên nền trong suốt; tab con nằm trong một khay nền xám bo tròn, chữ nhỏ hơn,
 * mục đang chọn là thẻ trắng nổi lên. Nhìn một cái là biết mình đang ở tầng nào.
 *
 * Tab đang chọn ghi vào query string (?tab=) nên gửi link cho nhau vẫn mở đúng tab.
 */
export const WaysTabs: React.FC<Props> = ({ onOpenUploadModal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pillarImages, handlePillarImageUpload } = usePillarImages();
  const khayRef = useRef<HTMLDivElement>(null);

  const tuUrl = searchParams.get('tab');
  const macDinh = BHY_WAYS[0].id;
  const dangChon = BHY_WAYS.some((w) => w.id === tuUrl) ? (tuUrl as string) : macDinh;

  const [chiBao, setChiBao] = useState<{ left: number; width: number } | null>(null);

  // Đo vị trí nút đang chọn để trượt dải nền — dùng transform nên không gây vẽ lại bố cục
  useEffect(() => {
    const khay = khayRef.current;
    if (!khay) return;
    const nut = khay.querySelector<HTMLElement>(`[data-tab-id="${dangChon}"]`);
    if (!nut) return;
    const doVi = () => setChiBao({ left: nut.offsetLeft, width: nut.offsetWidth });
    doVi();
    // Trình duyệt quá cũ không có ResizeObserver: dải chỉ báo vẫn đặt đúng chỗ
    // lần đầu, chỉ không tự đo lại khi đổi bề ngang — chấp nhận được.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(doVi);
    ro.observe(khay);
    return () => ro.disconnect();
  }, [dangChon]);

  const chon = (id: string) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', id);
    setSearchParams(p, { replace: true });
  };

  const anh = (id: string) => {
    const slot = SLOT_ANH[id] ?? id;
    return {
      images: pillarImages[slot] || [],
      onImageUpload: (index: number, fileOrUrl: string) => handlePillarImageUpload(slot, index, fileOrUrl),
    };
  };

  return (
    <div>
      {/* Khay tab con */}
      <div
        ref={khayRef}
        role="tablist"
        aria-label="Các thương hiệu trong Bắc Hưng Yên Ways"
        className={cn(
          'relative mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5',
          'scrollbar-none shadow-inner',
        )}
      >
        {/* Dải nền trượt theo mục đang chọn */}
        {chiBao && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 top-1.5 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-[transform,width] duration-normal ease-smooth"
            style={{ transform: `translateX(${chiBao.left - 6}px)`, width: chiBao.width }}
          />
        )}

        {BHY_WAYS.map((w) => {
          const active = w.id === dangChon;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              id={`tab-${w.id}`}
              data-tab-id={w.id}
              aria-selected={active}
              aria-controls={`panel-${w.id}`}
              onClick={() => chon(w.id)}
              className={cn(
                'relative z-10 flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3.5 py-2',
                'text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'font-semibold text-brand-navy' : 'font-medium text-slate-500 hover:text-brand-navy',
              )}
            >
              <w.icon
                className="h-4 w-4 shrink-0 transition-colors duration-fast"
                style={{ color: active ? w.accent : undefined }}
              />
              <span className="whitespace-nowrap">{w.ten}</span>
            </button>
          );
        })}
      </div>

      {/* Nội dung tab con */}
      <div
        key={dangChon}
        role="tabpanel"
        id={`panel-${dangChon}`}
        aria-labelledby={`tab-${dangChon}`}
        className="animate-rise-in rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        {dangChon === 'sharing' && <SharingPillar {...anh('sharing')} onOpenUploadModal={onOpenUploadModal} />}
        {dangChon === 'quizzi' && <QuizziPillar {...anh('quizzi')} />}
        {/* Một chức năng một cửa: tab chỉ giới thiệu, nơi làm việc thật ở trang riêng */}
        {dangChon === 'ideas' && <IdeasPillar {...anh('ideas')} onOpenUploadModal={onOpenUploadModal} introOnly />}
        {dangChon === 'connect' && <ConnectPillar {...anh('connect')} />}
        {dangChon === 'sao-xung-dang' && <SaoXungDangPillar {...anh('sao-xung-dang')} />}
        {dangChon === 'credit-360' && <Credit360Pillar {...anh('credit-360')} introOnly />}
      </div>
    </div>
  );
};
