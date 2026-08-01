import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Newspaper, Upload, FolderOpen } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { NewsFeedCard } from '@/components/one/news/NewsFeedCard';
import { UploadModal } from '@/components/one/UploadModal';
import { useOneUploads } from '@/components/one/useOneUploads';
import { useAuth } from '@/hooks/useAuth';
import { sapXepTinTuc } from '@/lib/tinTuc';

/**
 * TIN TỨC NỘI BỘ — danh sách đầy đủ.
 *
 * Đây là dòng tin trước kia nằm trong tab «Dòng chia sẻ» của trang Học hỏi.
 * Trang chủ chỉ giữ dải trượt ngang 12 tin mới nhất; nơi đọc hết nằm ở đây.
 * Bấm một thẻ ở Trang chủ sẽ tới `/one/tin-tuc?tin=<id>` — tin đó tự mở sẵn
 * phần chi tiết và trang tự cuộn tới đúng chỗ.
 */
export default function OneNewsPage() {
  const { isGuest } = useAuth();
  const { items, addItem, likeItem } = useOneUploads();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const daCuon = useRef(false);

  const tinMoTruoc = searchParams.get('tin');
  const danhSach = sapXepTinTuc(items);

  // Thao tác nhanh «Chia sẻ kinh nghiệm» ở Trang chủ: /one/tin-tuc?action=chia-se
  useEffect(() => {
    if (searchParams.get('action') === 'chia-se' && !isGuest) {
      setIsUploadOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, isGuest]);

  // Cuộn tới tin được chọn — chỉ làm MỘT lần, nếu không mỗi lần dữ liệu tự làm
  // mới (react-query) trang lại giật về đúng thẻ đó dù người đọc đã cuộn đi chỗ khác
  useEffect(() => {
    if (!tinMoTruoc || daCuon.current || items.length === 0) return;
    const el = document.getElementById(`tin-${tinMoTruoc}`);
    if (!el) return;
    daCuon.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [tinMoTruoc, items.length]);

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-brand-navy">
            <Newspaper className="h-4 w-4" />
            Tin tức nội bộ
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
            Dòng tin Bắc Hưng Yên
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Hoạt động, kinh nghiệm nghiệp vụ và thông báo của toàn Chi nhánh. Tin ghim của
            Phòng TCTH luôn nằm trên đầu.
          </p>

          {!isGuest && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-brand-navy to-brand-royal px-5 py-2.5 text-sm font-black text-white shadow-md transition-all hover:shadow-lg"
              >
                <Upload className="h-4 w-4" />
                Đăng tin / chia sẻ kinh nghiệm
              </button>
              <Link
                to="/one/hoc-hoi"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition-colors hover:border-brand-navy hover:text-brand-navy"
              >
                <FolderOpen className="h-4 w-4" />
                Tra cứu kho tri thức
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {danhSach.length === 0 && (
            <p className="py-16 text-center text-sm text-slate-500">
              Chưa có tin nào{isGuest ? ' được mở cho khách' : ''} — hãy là người đầu tiên!
            </p>
          )}
          {danhSach.map((item) => (
            <NewsFeedCard
              key={item.id}
              item={item}
              onLike={likeItem}
              moSan={item.id === tinMoTruoc}
            />
          ))}
        </div>
      </section>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitNewItem={addItem}
        defaultCategory="sharing"
      />
    </OnePageShell>
  );
}
