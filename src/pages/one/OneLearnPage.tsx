import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, FolderOpen, Zap, ArrowRight, ThumbsUp, Upload, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { DataRepository } from '@/components/one/DataRepository';
import { UploadModal } from '@/components/one/UploadModal';
import { PdfReportModal } from '@/components/one/PdfReportModal';
import { useOneUploads } from '@/components/one/useOneUploads';
import { useAuth } from '@/hooks/useAuth';
import { UploadedItem, CATEGORY_NAMES } from '@/data/one/types';

// Học hỏi & Chia sẻ — MỘT không gian gộp BHY Sharing + Kho tri thức (chung một
// kho dữ liệu phía sau), trình bày 2 tab: Dòng chia sẻ (bài mới) / Tra cứu kho.
// BHY Quizzi có nhà duy nhất tại /quizzi — ở đây chỉ đặt lối vào.

type LearnTab = 'chia-se' | 'kho';

function FeedCard({ item, onLike }: { item: UploadedItem; onLike: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = !!item.content || (item.imageUrls?.length ?? 0) > 1
    || Object.values(item.customValues ?? {}).some(v => v?.trim());

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {item.imageUrl && (
          <div className="sm:w-56 shrink-0 h-44 sm:h-auto bg-slate-100">
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-brand-royal uppercase">
              {CATEGORY_NAMES[item.category] || item.category}
            </span>
            {item.isShared && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Đã chia sẻ đối tác</span>
            )}
          </div>
          <h3 className="font-black text-slate-800 text-base leading-snug">{item.title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed mt-1.5 line-clamp-3">{item.summary}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500 font-semibold">
            <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{item.author}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{item.date}</span>
            <span>{item.department}</span>
            <button
              onClick={() => onLike(item.id)}
              className="inline-flex items-center gap-1 text-brand-royal hover:text-brand-navy font-bold cursor-pointer"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {item.likes}
            </button>
            {hasMore && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-brand-navy ml-auto cursor-pointer"
              >
                {expanded ? <>Thu gọn <ChevronUp className="w-3.5 h-3.5" /></> : <>Xem thêm <ChevronDown className="w-3.5 h-3.5" /></>}
              </button>
            )}
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-3">
              {item.content && (
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{item.content}</p>
              )}
              {(item.imageUrls?.length ?? 0) > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {item.imageUrls!.map((u, i) => (
                    <img key={i} src={u} alt={`Ảnh ${i + 1}`} className="h-24 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}
              {Object.entries(item.customValues ?? {}).filter(([, v]) => v?.trim()).map(([k, v]) => (
                <p key={k} className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-brand-navy">
                    {k === 'details' ? 'Chi tiết áp dụng: ' : k === 'benefits' ? 'Giá trị mang lại: ' : k === 'scope' ? 'Phạm vi áp dụng: ' : `${k}: `}
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

export default function OneLearnPage() {
  const { isGuest } = useAuth();
  const { items, addItem, likeItem, deleteItem, toggleShare } = useOneUploads();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<LearnTab>('chia-se');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('sharing');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Thao tác nhanh "Chia sẻ kinh nghiệm" từ Trang chủ ONE: /one/hoc-hoi?action=chia-se
  useEffect(() => {
    if (searchParams.get('action') === 'chia-se' && !isGuest) {
      setIsUploadOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, isGuest]);

  const handleOpenUpload = (cat: string = 'sharing') => {
    setUploadCategory(cat);
    setIsUploadOpen(true);
  };

  return (
    <OnePageShell>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-brand-navy font-black text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            Học hỏi &amp; Chia sẻ
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-brand-navy uppercase tracking-tight">
            BHY Sharing &amp; Kho tri thức
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Một không gian chung: chia sẻ kinh nghiệm của bạn và tra cứu tư liệu,
            hình ảnh, cách làm hay của toàn Chi nhánh.
          </p>
        </div>

        {/* Lối vào BHY Quizzi — nhà duy nhất của Quizzi nằm ở /quizzi */}
        {!isGuest && (
          <Link
            to="/quizzi"
            className="mb-8 flex items-center gap-4 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 via-white to-amber-50 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-slate-800">BHY Quizzi — luyện nghiệp vụ mỗi ngày</div>
              <p className="text-xs text-slate-500 mt-0.5">Chiến dịch quiz, thi đua theo phòng và bảng xếp hạng của Chi nhánh.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>
        )}

        {/* 2 tab của cùng một kho dữ liệu */}
        <div className="flex items-center gap-2 mb-6">
          {([
            { id: 'chia-se' as LearnTab, label: 'Dòng chia sẻ', icon: BookOpen },
            { id: 'kho' as LearnTab, label: 'Tra cứu kho', icon: FolderOpen },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
                tab === id
                  ? 'bg-brand-navy text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-navy hover:text-brand-navy'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          {!isGuest && tab === 'chia-se' && (
            <button
              onClick={() => handleOpenUpload('sharing')}
              className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-navy to-brand-royal text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Chia sẻ kinh nghiệm
            </button>
          )}
        </div>

        {tab === 'chia-se' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {items.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-16">
                Chưa có bài chia sẻ nào{isGuest ? ' được mở cho khách' : ''} — hãy là người đầu tiên!
              </p>
            )}
            {items.map(item => (
              <FeedCard key={item.id} item={item} onLike={likeItem} />
            ))}
          </div>
        )}
      </section>

      {tab === 'kho' && (
        <DataRepository
          items={items}
          onOpenUpload={handleOpenUpload}
          onLikeItem={likeItem}
          onDeleteItem={deleteItem}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenReport={() => setIsReportOpen(true)}
          onToggleShare={toggleShare}
        />
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitNewItem={addItem}
        defaultCategory={uploadCategory}
      />
      <PdfReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        items={items}
      />
    </OnePageShell>
  );
}
