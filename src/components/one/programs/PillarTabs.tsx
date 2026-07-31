import React, { useState } from 'react';
import { BookOpen, HelpCircle, Lightbulb, ShieldAlert, Zap, Share2 } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';
import { UploadedItem } from '@/data/one/types';
import { usePillarImages } from './PillarGallery';
import { TechnologyPillar } from './TechnologyPillar';
import { ConnectPillar } from './ConnectPillar';
import { SharingPillar } from './SharingPillar';
import { QuizziPillar } from './QuizziPillar';
import { IdeasPillar } from './IdeasPillar';
import { Credit360Pillar } from './Credit360Pillar';

type PillarId = 'connect' | 'technology' | 'sharing' | 'quizzi' | 'ideas' | 'credit360';

interface PillarTabsProps {
  onOpenUploadModal: (cat: string) => void;
  uploadedItems: UploadedItem[];
}

// 6 trụ cột chương trình đặc trưng của Chi nhánh (tách từ UniquePrograms bản nguồn,
// mỗi trụ cột là một component riêng trong cùng thư mục programs/).
export const PillarTabs: React.FC<PillarTabsProps> = ({ onOpenUploadModal }) => {
  const [activePillar, setActivePillar] = useState<PillarId>('technology');
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  // Props gallery dùng chung cho từng panel trụ cột
  const galleryProps = (pillarId: PillarId) => ({
    images: pillarImages[pillarId] || [],
    onImageUpload: (index: number, fileOrUrl: string) => handlePillarImageUpload(pillarId, index, fileOrUrl)
  });

  return (
    <section id="programs" className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-red mb-2 block">
            <EditableText id="programs.tag" defaultVal="Văn hóa & Bản sắc VietinBank Bắc Hưng Yên" className="font-bold uppercase text-xs" />
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-navy tracking-tight mb-4">
            <EditableText id="programs.title" defaultVal="ĐẶC TRƯNG RIÊNG CÓ CHI NHÁNH" className="font-black text-3xl sm:text-4xl uppercase" />
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            <EditableText
              id="programs.desc"
              defaultVal="Khám phá chi tiết các chương trình đặc trưng văn hóa riêng có của Chi nhánh: Công nghệ số và ứng dụng AI trên mọi hành trình, Kết nối kinh doanh BHY Connect, chia sẻ tri thức và đào tạo."
              multiline={true}
              as="span"
            />
          </p>
        </div>

        {/* Pillar Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 border-b border-slate-200 pb-6">
          {[
            { id: 'technology', label: '1. Công Nghệ Số & Ứng Dụng AI Trên Mọi Hành Trình', icon: Zap, color: 'text-brand-red' },
            { id: 'connect', label: '2. BHY Connect (Hội Nghị & Hệ Sinh Thái)', icon: Share2, color: 'text-brand-royal' },
            { id: 'sharing', label: '3. BHY Sharing', icon: BookOpen, color: 'text-blue-600' },
            { id: 'quizzi', label: '4. BHY Quizzi', icon: HelpCircle, color: 'text-red-600' },
            { id: 'ideas', label: '5. BHY Ideas', icon: Lightbulb, color: 'text-amber-500' },
            { id: 'credit360', label: '6. BHY Credit 360', icon: ShieldAlert, color: 'text-emerald-600' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activePillar === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePillar(tab.id as PillarId)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  isActive
                    ? 'bg-brand-navy text-white ring-2 ring-offset-2 ring-brand-navy scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-brand-navy'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pillar Content Container */}
        <div className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl min-h-[500px]">
          {activePillar === 'technology' && <TechnologyPillar {...galleryProps('technology')} />}
          {activePillar === 'connect' && <ConnectPillar {...galleryProps('connect')} />}
          {activePillar === 'sharing' && <SharingPillar {...galleryProps('sharing')} onOpenUploadModal={onOpenUploadModal} />}
          {activePillar === 'quizzi' && <QuizziPillar {...galleryProps('quizzi')} />}
          {/* Một chức năng một cửa: trang đặc trưng chỉ giới thiệu, nơi làm việc thật ở trang riêng */}
          {activePillar === 'ideas' && <IdeasPillar {...galleryProps('ideas')} onOpenUploadModal={onOpenUploadModal} introOnly />}
          {activePillar === 'credit360' && <Credit360Pillar {...galleryProps('credit360')} introOnly />}
        </div>
      </div>
    </section>
  );
};
