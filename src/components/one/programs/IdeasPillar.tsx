import React, { useState } from 'react';
import { Lightbulb, Upload } from 'lucide-react';
import confetti from 'canvas-confetti';
import { EditableText, useAdminEditable } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';

interface IdeasPillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
  onOpenUploadModal: (defaultCategory: string) => void;
}

export const IdeasPillar: React.FC<IdeasPillarProps> = ({ images, onImageUpload, onOpenUploadModal }) => {
  const { isAdmin } = useAdminEditable();

  // --- Ideas Estimator State ---
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaScope, setIdeaScope] = useState<'phòng' | 'chi_nhánh' | 'nhân_rộng'>('phòng');
  const [ideaPilotDone, setIdeaPilotDone] = useState(false);
  const [estimatedTier, setEstimatedTier] = useState<string | null>(null);

  const calculateIdeaTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    let tier = 'Ươm mầm (Thưởng nhanh 100.000đ)';
    if (ideaScope === 'nhân_rộng' && ideaPilotDone) {
      tier = 'Lan tỏa ⭐ (Thưởng 2.000.000đ – 3.000.000đ)';
      confetti({ particleCount: 100, spread: 80 });
    } else if (ideaPilotDone) {
      tier = 'Vươn cành 🌳 (Thưởng 1.000.000đ)';
    } else if (ideaScope === 'chi_nhánh') {
      tier = 'Bén rễ 🌱 (Thưởng 300.000đ)';
    }
    setEstimatedTier(tier);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      <div className="lg:col-span-6 space-y-6">
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

        {/* 4 Tier Cards Breakdown */}
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

      {/* Ideas Estimator Form */}
      <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-amber-300 shadow-md space-y-4">
        <div className="relative h-40 rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <img src={images[0]} alt="BHY Ideas Illustration" className="w-full h-full object-cover" />
          <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
        </div>
        <h4 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span>Dự Toán Cấp Độ Khen Thưởng Ý Tưởng Cải Tiến</span>
        </h4>

        <form onSubmit={calculateIdeaTier} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên ý tưởng bất cập phát hiện:</label>
            <input
              type="text"
              placeholder="VD: Cải tiến thao tác in sao kê tự động tại quầy..."
              value={ideaTitle}
              onChange={e => setIdeaTitle(e.target.value)}
              className="w-full p-2.5 border rounded-lg outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Thẩm quyền xử lý sáng kiến:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'phòng', label: 'Cấp Phòng tự xử' },
                { id: 'chi_nhánh', label: 'Cần Chi nhánh/TSC' },
                { id: 'nhân_rộng', label: 'Chuẩn hóa toàn CN' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIdeaScope(s.id as 'phòng' | 'chi_nhánh' | 'nhân_rộng')}
                  className={`p-2 rounded border text-center font-semibold ${ideaScope === s.id ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-700'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="pilotCheckbox"
              checked={ideaPilotDone}
              onChange={e => setIdeaPilotDone(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500"
            />
            <label htmlFor="pilotCheckbox" className="font-medium text-slate-700">
              Đã thử nghiệm pilot có bằng chứng giảm lỗi / tăng năng suất
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white font-bold text-xs sm:text-sm shadow"
          >
            Tính toán mức thưởng định mức
          </button>
        </form>

        {estimatedTier && (
          <div className="mt-5 p-4 bg-amber-50 rounded-xl border border-amber-300 text-center animate-fade-in">
            <span className="text-xs font-bold text-slate-500 block mb-1">Kết quả xét nghiệm kỳ vọng:</span>
            <span className="text-base sm:text-lg font-black text-brand-red block">{estimatedTier}</span>
            {isAdmin && (
              <button
                onClick={() => onOpenUploadModal('ideas')}
                className="mt-3 inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Gửi minh chứng chính thức
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
