import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Images, Newspaper } from 'lucide-react';
import { useOneUploads } from '@/components/one/useOneUploads';
import type { UploadedItem } from '@/data/one/types';

/**
 * Bài viết chuyên mục «Bắc Hưng Yên Connect & Thư viện» lấy từ kho tư liệu
 * (cùng dữ liệu với Học hỏi và Tin tức nội bộ — cán bộ đăng một lần, trang
 * Connect tự có). Bài mới nhất được dựng to kèm bộ ảnh; các bài còn lại xếp
 * thành thẻ nhỏ. Bấm vào đâu cũng mở đúng bài ở Tin tức nội bộ, không đẻ thêm
 * màn đọc bài thứ hai.
 */
export function locBaiConnect(items: UploadedItem[]): UploadedItem[] {
  return items.filter((it) => it.category === 'connect');
}

export function BaiVietConnect() {
  const { items } = useOneUploads();
  const baiConnect = locBaiConnect(items);
  const [moiNhat, ...conLai] = baiConnect;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3.5 py-1 text-2xs font-black uppercase tracking-wider text-brand-royal">
            <Newspaper className="h-3.5 w-3.5" />
            Từ kho tư liệu
          </span>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-brand-navy sm:text-3xl">
            Bắc Hưng Yên Connect &amp; Thư viện
          </h2>
        </div>
        <Link
          to="/one/hoc-hoi"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-royal hover:underline"
        >
          Xem toàn bộ kho tri thức
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {!moiNhat ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
          Chưa có bài nào trong chuyên mục này. Đăng bài ở Học hỏi và chọn chuyên mục
          «Bắc Hưng Yên Connect &amp; Thư viện» là bài sẽ hiện ở đây.
        </p>
      ) : (
        <>
          <BaiNoiBat item={moiNhat} />
          {conLai.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {conLai.map((it) => (
                <TheBai key={it.id} item={it} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BaiNoiBat({ item }: { item: UploadedItem }) {
  const anh = item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [];
  const [dangXem, setDangXem] = useState(0);

  return (
    <article className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="relative aspect-[4/3] bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[360px]">
          {anh[dangXem] ? (
            <img src={anh[dangXem]} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-slate-300">
              <Images className="h-12 w-12" />
            </span>
          )}
          {anh.length > 1 && (
            <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-full bg-black/50 p-1.5 backdrop-blur">
              {anh.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  aria-label={`Ảnh ${i + 1}`}
                  onClick={() => setDangXem(i)}
                  className={`h-10 w-14 overflow-hidden rounded-md border-2 transition ${
                    i === dangXem ? 'border-amber-300' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col p-6 lg:col-span-5 sm:p-8">
        <span className="inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-brand-royal">
          <Calendar className="h-3 w-3" />
          {item.date} · {item.department}
        </span>
        <h3 className="mt-2 text-lg font-black leading-snug text-slate-800 sm:text-xl">{item.title.trim()}</h3>
        <p className="mt-3 line-clamp-[9] text-sm leading-relaxed text-slate-600 whitespace-pre-line">{item.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          {item.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-semibold text-slate-600">
              #{t}
            </span>
          ))}
          <Link
            to={`/one/tin-tuc?tin=${item.id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-brand-royal"
          >
            Đọc bài đầy đủ
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function TheBai({ item }: { item: UploadedItem }) {
  return (
    <Link
      to={`/one/tin-tuc?tin=${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-36 bg-slate-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        ) : (
          <span className="grid h-full w-full place-items-center text-slate-300">
            <Newspaper className="h-10 w-10" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-2xs font-bold uppercase tracking-wider text-brand-royal">
          {item.date} · {item.department}
        </span>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-800">{item.title}</h3>
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">{item.summary}</p>
      </div>
    </Link>
  );
}
