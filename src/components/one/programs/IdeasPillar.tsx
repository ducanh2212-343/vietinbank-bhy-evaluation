import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePortalIdeas, type PortalIdea } from '@/components/one/ideas/usePortalIdeas';
import { IdeaForm } from '@/components/one/ideas/IdeaForm';
import { IdeaList } from '@/components/one/ideas/IdeaList';
import { IdeaStatsPanel } from '@/components/one/ideas/IdeaStatsPanel';
import { khopTimKiem } from '@/lib/vietnamese';
import type { IdeaLevel } from '@/data/one/ideasConfig';

// Trụ cột 5 — BHY Ideas: thân của màn «Gửi & tra cứu ý tưởng».
//
// Trang này từng gánh năm việc trong một mạch cuộn dọc (giới thiệu dài, thống
// kê, form, việc Giám đốc, chốt Ươm mầm, rồi bảng theo dõi mở sẵn cả trăm thẻ).
// Nay các việc quản trị đã sang màn «Vận hành & phê duyệt», ở đây giữ đúng hai
// việc của cán bộ: GỬI ý tưởng và TRA CỨU ý tưởng đã có.
//
// Khách đối tác (guest) chỉ xem phần giới thiệu tĩnh — RLS chặn dữ liệu nên
// không render form/danh sách.

interface IdeasPillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
  onOpenUploadModal: (defaultCategory: string) => void;
  /** Trang đặc trưng chỉ giới thiệu — nơi làm việc thật là /one/y-tuong (một chức năng một cửa) */
  introOnly?: boolean;
}

/** Tên hiển thị của người đang đăng nhập (profiles.full_name) — dùng đổ sẵn form & bình luận */
function useMyFullName(): string {
  const { user, profileId } = useAuth();
  const { data } = useQuery({
    queryKey: ['one-my-full-name', profileId],
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data: row } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', profileId!)
        .maybeSingle();
      return row?.full_name ?? null;
    },
  });
  return data || user?.email?.split('@')[0] || '';
}

/**
 * Bốn cấp độ khen thưởng — dải ngang gọn.
 *
 * Bản cũ là bốn ô lớn xếp 2×2 chiếm trọn nửa màn hình đầu tiên, đẩy form gửi ý
 * tưởng (việc chính) xuống dưới nếp gấp. Nội dung sửa tại chỗ giữ NGUYÊN mã ô
 * (programs.ideas.tier1…4) nên phần quản trị đã sửa không mất.
 */
const DaiCapDo: React.FC = () => (
  <div className="space-y-2">
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
      <EditableText
        id="programs.ideas.budget"
        defaultVal="Tổng ngân sách khen thưởng: 100.000.000 VNĐ"
        className="text-xs font-bold"
      />
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[
        { id: 'programs.ideas.tier1', def: '1. Ươm mầm 🌱&#10;Dám nghĩ dám đề xuất&#10;Thưởng: 100.000đ', vien: 'border-amber-200' },
        { id: 'programs.ideas.tier2', def: '2. Bén rễ 🌿&#10;Được TSC phê duyệt&#10;Thưởng: 300.000đ', vien: 'border-teal-200' },
        { id: 'programs.ideas.tier3', def: '3. Vươn cành 🌳&#10;Pilot có kết quả rõ&#10;Thưởng: 1.000.000đ', vien: 'border-emerald-300' },
        { id: 'programs.ideas.tier4', def: '4. Lan tỏa ⭐&#10;Chuẩn hóa nhân rộng&#10;2.000.000 - 3.000.000đ', vien: 'border-rose-300' },
      ].map(o => (
        <div key={o.id} className={`rounded-xl border bg-white p-2.5 shadow-sm ${o.vien}`}>
          <EditableText
            id={o.id}
            defaultVal={o.def.replace(/&#10;/g, '\n')}
            className="whitespace-pre-line text-xs leading-relaxed"
            multiline
            as="div"
          />
        </div>
      ))}
    </div>
  </div>
);

export const IdeasPillar: React.FC<IdeasPillarProps> = ({ images, onImageUpload, introOnly }) => {
  const { isGuest } = useAuth();
  const { ideas, isLoading, isContentAdmin, createIdea, updateIdea, deleteIdea, setVote, adminUpdateStatus } = usePortalIdeas();
  const myName = useMyFullName();

  const [filterLevel, setFilterLevel] = useState<'all' | IdeaLevel>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PortalIdea | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  // Trang đặc trưng (introOnly) và khách đối tác: chỉ xem giới thiệu tĩnh.
  if (isGuest || introOnly) {
    return (
      <div className="grid animate-fade-in grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-6">
          <DaiCapDo />
          {introOnly && !isGuest && (
            <Link
              to="/one/y-tuong"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-amber-600"
            >
              Vào hệ thống BHY Ideas
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="rounded-2xl border border-amber-300 bg-white p-6 shadow-md lg:col-span-6">
          <div className="relative h-56 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <img src={images[0]} alt="BHY Ideas Illustration" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  // Lọc theo cấp + tìm kiếm không dấu trên toàn bộ nội dung phiếu.
  // Mục đích chính: cán bộ tra trước khi gửi để tránh đề xuất trùng ý tưởng đã có.
  const byLevel = filterLevel === 'all' ? ideas : ideas.filter(i => i.level === filterLevel);
  const filteredIdeas = search.trim()
    ? byLevel.filter(i =>
        khopTimKiem(
          [i.title, i.proposer, i.departmentName, i.currentStatus, i.proposedSolution, i.expectedBenefits].join(' '),
          search,
        ))
    : byLevel;

  const handleStartEdit = (idea: PortalIdea) => {
    setEditing(idea);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Bốn cấp độ và ngân sách đã nằm ở trang giới thiệu /one/y-tuong — màn
          này mở ra là thấy ngay ô nhập, không phải cuộn qua phần giới thiệu. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Trái: thống kê thời gian thực */}
        <div className="lg:col-span-5">
          <IdeaStatsPanel ideas={ideas} />
        </div>

        {/* Phải: form đăng ký / cập nhật ý tưởng — việc chính của trang */}
        <div ref={formRef} className="space-y-4 rounded-2xl border border-amber-300 bg-white p-5 shadow-md sm:p-6 lg:col-span-7">
          <div className="relative mb-1 h-28 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <img src={images[0]} alt="BHY Ideas Illustration" className="h-full w-full object-cover" />
            <PillarAdminUploader onUpload={v => onImageUpload(0, v)} />
          </div>
          <IdeaForm
            canSubmitForOthers={isContentAdmin}
            onCreate={createIdea}
            onUpdate={updateIdea}
            editing={editing}
            onDone={() => setEditing(null)}
          />
        </div>
      </div>

      {/* Bảng theo dõi ý tưởng toàn chi nhánh */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-800 sm:text-lg">
              <ClipboardList className="h-5 w-5 text-amber-500" />
              Bảng theo dõi ý tưởng toàn Chi nhánh
            </h2>
            <p className="text-xs text-slate-500">
              Tra cứu trước khi gửi để khỏi đề xuất trùng ý tưởng phòng khác đã có.
            </p>

            <div className="relative mt-3 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm ý tưởng toàn chi nhánh (gõ không dấu cũng được)…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
                  title="Xóa tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {search.trim() && (
              <p className="mt-1.5 text-xs font-semibold text-slate-500">
                Tìm thấy <span className="font-black text-amber-600">{filteredIdeas.length}</span> ý tưởng khớp
                {filteredIdeas.length > 0 && ' — đọc kỹ trước khi gửi ý tưởng mới để tránh trùng.'}
              </p>
            )}
          </div>

          {/* Bộ lọc cấp đề xuất. Kết xuất Excel và lọc theo ngày đã sang màn
              «Vận hành & phê duyệt» — đó là việc của TCTH, không phải của mọi người. */}
          <div className="flex shrink-0 items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Lọc theo cấp:</span>
            <div className="flex gap-1 rounded-lg border bg-slate-100 p-1">
              {([
                { id: 'all', label: 'Tất cả' },
                { id: 'Nội bộ CN', label: 'Nội bộ CN' },
                { id: 'Đề xuất TSC', label: 'Đề xuất TSC' },
              ] as { id: 'all' | IdeaLevel; label: string }[]).map(btn => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilterLevel(btn.id)}
                  className={`cursor-pointer rounded-md px-3 py-1 text-center text-xs font-bold transition-all ${filterLevel === btn.id ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <IdeaList
          ideas={filteredIdeas}
          isFiltered={!!search.trim() || filterLevel !== 'all'}
          isLoading={isLoading}
          isContentAdmin={isContentAdmin}
          myName={myName}
          onEdit={handleStartEdit}
          onDelete={deleteIdea}
          onVote={setVote}
          onAdminUpdate={adminUpdateStatus}
        />
      </div>
    </div>
  );
};
