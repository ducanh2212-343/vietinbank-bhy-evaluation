import React from 'react';
import { Sparkles, ArrowRight, Award, Zap, RefreshCw } from 'lucide-react';
import { EditableText } from './AdminEditableContext';

interface HeroProps {
  onExplorePrograms: () => void;
  onExploreMoves: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExplorePrograms,
  onExploreMoves
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-slate-50 pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200">

      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-red-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">

          {/* Pill kỷ niệm 20 năm */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-navy to-brand-red text-white text-xs sm:text-sm font-bold uppercase tracking-widest shadow-md mb-6 animate-pulse">
            <Award className="w-4 h-4 text-amber-300" />
            <EditableText
              id="hero.pill"
              defaultVal="Chào mừng Kỷ niệm 20 Năm Thành Lập (2006 - 2026)"
              className="font-bold uppercase tracking-widest"
            />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-brand-navy tracking-tight leading-tight mb-4">
            <EditableText id="hero.title1" defaultVal="VIETINBANK" className="text-brand-navy" />{' '}
            <EditableText id="hero.title2" defaultVal="BẮC HƯNG YÊN" className="text-brand-red" />
          </h1>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight mb-6 bg-gradient-to-r from-brand-navy via-brand-sky to-brand-navy bg-clip-text text-transparent">
            <EditableText id="hero.slogan" defaultVal="Vun Gốc Bền Rễ - Vươn Tầm Tương Lai" />
          </h2>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            <EditableText
              id="hero.description"
              defaultVal="Hệ sinh thái liên thông Học tập - Đổi mới - Thực thi độc đáo. Kết nối chuẩn mực các chương trình Sharing, Quizzi, Ideas, Credit 360 và Bộ 3 Chiêu thức vận hành nhằm thúc đẩy năng suất, quản trị rủi ro và lan tỏa văn hóa VietinBank."
              multiline={true}
              as="span"
            />
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <button
              onClick={onExplorePrograms}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-navy hover:bg-[#003870] text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-900/20 hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-5 h-5 text-brand-red" />
              <EditableText id="hero.cta1" defaultVal="Khám Phá Đặc Trưng" className="font-bold" />
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreMoves}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-brand-navy border-2 border-brand-navy font-bold text-sm sm:text-base shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <EditableText id="hero.cta2" defaultVal="Bộ 3 Chiêu Thức 2026" className="font-bold" />
            </button>

          </div>

          {/* Vòng lặp PDCA */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-100 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4 text-xs font-bold text-brand-navy uppercase tracking-wider">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-red" style={{ animationDuration: '8s' }} />
              <EditableText id="hero.pdca_title" defaultVal="Vòng Lặp Liên Thông PDCA Khép Kín Tại Chi Nhánh" className="font-bold text-xs uppercase" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 text-center">
              {[
                { id: 'step1', name: 'Sharing', subtitle: 'Tạo tri thức', icon: '📚', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { id: 'step2', name: 'Quizzi', subtitle: 'Hiểu đúng', icon: '🎯', color: 'bg-red-50 text-red-700 border-red-200' },
                { id: 'step3', name: 'Ideas', subtitle: 'Phát hiện cải tiến', icon: '💡', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { id: 'step4', name: 'Credit 360', subtitle: 'Thẩm định 360°', icon: '⚖️', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { id: 'step5', name: 'E-Library', subtitle: 'Lưu trữ & Dùng lại', icon: '🏛️', color: 'bg-purple-50 text-purple-700 border-purple-200' }
              ].map((step, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${step.color} flex flex-col items-center justify-center relative shadow-sm`}>
                  <span className="text-xl mb-1">{step.icon}</span>
                  <EditableText id={`hero.pdca.${step.id}.name`} defaultVal={step.name} className="font-extrabold text-xs sm:text-sm block" />
                  <EditableText id={`hero.pdca.${step.id}.subtitle`} defaultVal={step.subtitle} className="text-[10px] opacity-80 mt-0.5 block" />
                  {idx < 4 && (
                    <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300 font-black">
                      ›
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
