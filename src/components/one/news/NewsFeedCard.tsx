import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, ThumbsUp, User } from 'lucide-react';
import { UploadedItem, CATEGORY_NAMES } from '@/data/one/types';

/**
 * Thẻ tin dạng NẰM NGANG cho trang danh sách đầy đủ /one/tin-tuc.
 *
 * Trước đây thẻ này nằm trong OneLearnPage dưới tên «Dòng chia sẻ». Nay dòng tin
 * đã chuyển thành Tin tức nội bộ nên thẻ tách ra thành phần dùng chung — trang
 * danh sách dùng bản nằm ngang này, Trang chủ dùng bản dựng đứng trong NewsRail.
 */
export function NewsFeedCard({
  item,
  onLike,
  moSan,
}: {
  item: UploadedItem;
  onLike: (id: string) => void;
  /** Mở sẵn phần chi tiết — dùng khi vào thẳng từ dải tin Trang chủ */
  moSan?: boolean;
}) {
  const [expanded, setExpanded] = useState(!!moSan);
  const hasMore =
    !!item.content ||
    (item.imageUrls?.length ?? 0) > 1 ||
    Object.values(item.customValues ?? {}).some((v) => v?.trim());

  return (
    <article
      id={`tin-${item.id}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row">
        {item.imageUrl && (
          <div className="h-44 shrink-0 bg-slate-100 sm:h-auto sm:w-56">
            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1 p-5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="rounded bg-blue-50 px-2 py-0.5 uppercase text-brand-royal">
              {CATEGORY_NAMES[item.category] || item.category}
            </span>
            {item.isFeatured && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">Tin ghim</span>
            )}
            {item.isShared && (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">Đã chia sẻ đối tác</span>
            )}
          </div>
          <h3 className="text-base font-black leading-snug text-slate-800">{item.title}</h3>
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">{item.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{item.author}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{item.date}</span>
            <span>{item.department}</span>
            <button
              onClick={() => onLike(item.id)}
              className="inline-flex cursor-pointer items-center gap-1 font-bold text-brand-royal hover:text-brand-navy"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {item.likes}
            </button>
            {hasMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="ml-auto inline-flex cursor-pointer items-center gap-1 font-bold text-slate-600 hover:text-brand-navy"
              >
                {expanded ? <>Thu gọn <ChevronUp className="h-3.5 w-3.5" /></> : <>Xem thêm <ChevronDown className="h-3.5 w-3.5" /></>}
              </button>
            )}
          </div>

          {expanded && (
            <div className="mt-4 space-y-3 border-t border-dashed border-slate-200 pt-4">
              {item.content && (
                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">{item.content}</p>
              )}
              {(item.imageUrls?.length ?? 0) > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {item.imageUrls!.map((u, i) => (
                    <img key={i} src={u} alt={`Ảnh ${i + 1}`} className="h-24 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}
              {Object.entries(item.customValues ?? {})
                .filter(([, v]) => v?.trim())
                .map(([k, v]) => (
                  <p key={k} className="text-xs leading-relaxed text-slate-600">
                    <span className="font-bold text-brand-navy">
                      {k === 'details'
                        ? 'Chi tiết áp dụng: '
                        : k === 'benefits'
                          ? 'Giá trị mang lại: '
                          : k === 'scope'
                            ? 'Phạm vi áp dụng: '
                            : `${k}: `}
                    </span>
                    {v}
                  </p>
                ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
