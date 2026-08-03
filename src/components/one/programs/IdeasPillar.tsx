import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePortalIdeas, type PortalIdea } from '@/components/one/ideas/usePortalIdeas';
import { IdeaForm } from '@/components/one/ideas/IdeaForm';
import { IdeaList } from '@/components/one/ideas/IdeaList';
import { IdeaStatsPanel } from '@/components/one/ideas/IdeaStatsPanel';
import { buildIdeasCsv, downloadIdeasCsv, filterIdeasByDate } from '@/components/one/ideas/ideasCsv';
import type { IdeaLevel } from '@/data/one/ideasConfig';

// Trụ cột 5 — BHY Ideas (Đợt 4): hệ thống ý tưởng sáng kiến thời gian thực
// port từ bản deploy (Firebase) sang Supabase. Khách đối tác (guest) chỉ xem
// phần giới thiệu tĩnh — RLS chặn dữ liệu nên không render form/danh sách.

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

/** Khối giới thiệu tĩnh (giữ nguyên nội dung EditableText của bản cũ) */
const IdeasIntro: React.FC = () => (
  <div className="space-y-4">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
      <EditableText id="programs.ideas.budget" defaultVal="Tổng ngân sách khen thưởng: 100.000.000 VNĐ" className="font-bold text-xs" />
    </div>
    <h3 className="text-2xl sm:text-3xl font-black text-amber-600">
      <EditableText id="programs.ideas.title" defaultVal="Bắc Hưng Yên Ideas" className="font-black text-2xl sm:text-3xl text-amber-600" />
    </h3>
    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
      <EditableText
        id="programs.ideas.desc"
        defaultVal="Khuyến khích cán bộ quan sát phát hiện bất cập trong công việc để đề xuất sáng kiến cải tiến. Phân định rõ 2 luồng SMP (cấp Chi nhánh & Trụ sở chính)."
        multiline={true}
        as="span"
      />
    </p>

    {/* 4 cấp độ khen thưởng */}
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm">
        <EditableText id="programs.ideas.tier1" defaultVal="1. Ươm mầm 🌱&#10;Dám nghĩ dám đề xuất&#10;Thưởng: 100.000đ" className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
      </div>
      <div className="p-3 bg-white rounded-xl border border-amber-300 shadow-sm">
        <EditableText id="programs.ideas.tier2" defaultVal="2. Bén rễ 🌿&#10;Được TSC phê duyệt&#10;Thưởng: 300.000đ" className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
      </div>
      <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-sm">
        <EditableText id="programs.ideas.tier3" defaultVal="3. Vươn cành 🌳&#10;Pilot có kết quả rõ&#10;Thưởng: 1.000.000đ" className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
      </div>
      <div className="p-3 bg-white rounded-xl border border-red-400 shadow-sm">
        <EditableText id="programs.ideas.tier4" defaultVal="4. Lan tỏa ⭐&#10;Chuẩn hóa nhân rộng&#10;2.000.000 - 3.000.000đ" className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
      </div>
    </div>

    <div className="p-4 bg-white rounded-xl border">
      <span className="font-bold text-xs text-brand-navy block mb-1">
        <EditableText id="programs.ideas.jury_title" defaultVal="⚖️ Chấm điểm Hội đồng (A1 - D2)" className="font-bold text-xs block" />
      </span>
      <p className="text-xs text-slate-600">
        <EditableText
          id="programs.ideas.jury_content"
          defaultVal="5 Tiêu chí trọng tâm: Đúng vấn đề, Hiểu quả, Khả thi, An toàn rủi ro (>=3/5), Nhân rộng. Điểm TB chung từ 3.5 trở lên xét Vươn cành, 4.0 trở lên xét Lan tỏa."
          multiline={true}
          as="span"
          className="text-xs"
        />
      </p>
    </div>
  </div>
);

export const IdeasPillar: React.FC<IdeasPillarProps> = ({ images, onImageUpload, introOnly }) => {
  const { isGuest } = useAuth();
  const { ideas, isLoading, isContentAdmin, createIdea, updateIdea, deleteIdea, setVote, adminUpdateStatus } = usePortalIdeas();
  const myName = useMyFullName();

  const [filterLevel, setFilterLevel] = useState<'all' | IdeaLevel>('all');
  const [editing, setEditing] = useState<PortalIdea | null>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const formRef = useRef<HTMLDivElement | null>(null);

  // Trang đặc trưng (introOnly) và khách đối tác: chỉ xem giới thiệu tĩnh.
  // Cán bộ ở chế độ giới thiệu có nút dẫn sang nơi làm việc thật /one/y-tuong.
  if (isGuest || introOnly) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        <div className="lg:col-span-6 space-y-5">
          <IdeasIntro />
          {introOnly && !isGuest && (
            <Link
              to="/one/y-tuong"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all hover:-translate-y-0.5"
            >
              Vào hệ thống BHY Ideas
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-amber-300 shadow-md">
          <div className="relative h-56 rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <img src={images[0]} alt="BHY Ideas Illustration" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  const filteredIdeas = filterLevel === 'all' ? ideas : ideas.filter(i => i.level === filterLevel);

  const handleStartEdit = (idea: PortalIdea) => {
    setEditing(idea);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExportCsv = () => {
    if (ideas.length === 0) {
      toast.error('Không có dữ liệu ý tưởng để kết xuất!');
      return;
    }
    const inRange = filterIdeasByDate(ideas, exportStartDate || undefined, exportEndDate || undefined);
    if (inRange.length === 0) {
      toast.error('Không có dữ liệu ý tưởng nào trong khoảng thời gian đã chọn!');
      return;
    }
    const csv = buildIdeasCsv(ideas, exportStartDate || undefined, exportEndDate || undefined);
    downloadIdeasCsv(csv, exportStartDate || undefined, exportEndDate || undefined);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Trái: giới thiệu + thống kê thời gian thực */}
        <div className="lg:col-span-5 space-y-6">
          <IdeasIntro />
          <IdeaStatsPanel ideas={ideas} />
        </div>

        {/* Phải: form đăng ký / cập nhật ý tưởng */}
        <div ref={formRef} className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-amber-300 shadow-md space-y-4">
          <div className="relative h-32 rounded-xl overflow-hidden shadow-sm border border-slate-200 mb-2">
            <img src={images[0]} alt="BHY Ideas Illustration" className="w-full h-full object-cover" />
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-100">
          <div>
            <h4 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              <span>Bảng Theo Dõi Ý Tưởng Toàn Chi Nhánh</span>
            </h4>
            <p className="text-xs text-slate-500">Xem và học hỏi các sáng kiến cải tiến từ đồng nghiệp (Cập nhật thời gian thực)</p>
          </div>

          {/* Bộ lọc cấp đề xuất + kết xuất (admin) */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Lọc theo cấp:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border">
                {([
                  { id: 'all', label: 'Tất cả' },
                  { id: 'Nội bộ CN', label: 'Nội bộ CN' },
                  { id: 'Đề xuất TSC', label: 'Đề xuất TSC' },
                ] as { id: 'all' | IdeaLevel; label: string }[]).map(btn => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setFilterLevel(btn.id)}
                    className={`px-3 py-1 rounded-md font-bold text-center text-[11px] transition-all cursor-pointer ${filterLevel === btn.id ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {isContentAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-1 px-2 rounded-xl">
                <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Từ:</span>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={e => setExportStartDate(e.target.value)}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] focus:border-emerald-500 outline-none font-semibold text-slate-700 cursor-pointer"
                />
                <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Đến:</span>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={e => setExportEndDate(e.target.value)}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] focus:border-emerald-500 outline-none font-semibold text-slate-700 cursor-pointer"
                />
                {(exportStartDate || exportEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setExportStartDate('');
                      setExportEndDate('');
                    }}
                    className="text-red-500 hover:text-red-700 font-bold text-[10px] bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                    title="Xóa bộ lọc thời gian"
                  >
                    Xóa lọc ngày
                  </button>
                )}
              </div>
            )}

            {isContentAdmin && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all cursor-pointer"
                title="Kết xuất ý tưởng ra file Excel (.csv) theo khoảng thời gian đã chọn"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            )}
          </div>
        </div>

        <IdeaList
          ideas={filteredIdeas}
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
