import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Zap, ArrowRight, Newspaper } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { DataRepository } from '@/components/one/DataRepository';
import { UploadModal } from '@/components/one/UploadModal';
import { PdfReportModal } from '@/components/one/PdfReportModal';
import { useOneUploads } from '@/components/one/useOneUploads';
import { useAuth } from '@/hooks/useAuth';

/**
 * BẮC HƯNG YÊN SHARING — Kho tri thức tra cứu được.
 *
 * Dòng tin theo thời gian đã tách khỏi trang này và trở thành TIN TỨC NỘI BỘ
 * (dải trượt ngang ở Trang chủ, danh sách đầy đủ ở /one/tin-tuc). Ở đây chỉ còn
 * việc TRA CỨU: lọc theo chuyên mục, phòng ban, từ khóa — đúng một việc một cửa.
 * Cùng một kho dữ liệu `portal_uploads` đứng sau cả hai nơi, cán bộ đăng một lần
 * là bài vừa lên dòng tin vừa nằm trong kho.
 */
export default function OneLearnPage() {
  const { isGuest } = useAuth();
  const { items, addItem, likeItem, deleteItem, toggleShare } = useOneUploads();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('sharing');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Liên kết cũ /one/hoc-hoi?action=chia-se vẫn phải mở được hộp đăng bài:
  // bookmark và tin nhắn nội bộ đã phát tán đường dẫn này
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
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-brand-navy">
            <BookOpen className="h-4 w-4" />
            Bắc Hưng Yên Sharing
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
            Kho tri thức Chi nhánh
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Tra cứu tư liệu, hình ảnh và cách làm hay của toàn Chi nhánh theo chuyên mục,
            phòng ban và từ khóa.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Lối sang dòng tin — phần trước đây là tab «Dòng chia sẻ» của trang này */}
          <Link
            to="/one/tin-tuc"
            className="group flex items-center gap-4 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-royal text-white shadow-md">
              <Newspaper className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-slate-800">Tin tức nội bộ</div>
              <p className="mt-0.5 text-xs text-slate-500">
                Dòng tin theo thời gian: hoạt động, kinh nghiệm và thông báo mới nhất.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-brand-royal transition-transform group-hover:translate-x-1" />
          </Link>

          {!isGuest && (
            <Link
              to="/quizzi"
              className="group flex items-center gap-4 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 via-white to-amber-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-md">
                <Zap className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-800">BHY Quizzi — luyện nghiệp vụ mỗi ngày</div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chiến dịch quiz, thi đua theo phòng và bảng xếp hạng của Chi nhánh.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-red-500 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </section>

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
