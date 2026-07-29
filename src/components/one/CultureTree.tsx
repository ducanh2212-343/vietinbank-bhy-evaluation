import React, { useState } from 'react';
import { Sprout, TreeDeciduous, Leaf, Users, Sparkles, Share2, ArrowRight, Heart, Award, Shield } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';

interface CultureTreeProps {
  // Điều hướng tới khu vực thay ảnh đại diện (do trang cha quyết định cách mở)
  onOpenAvatar: () => void;
}

export const CultureTree: React.FC<CultureTreeProps> = ({ onOpenAvatar }) => {
  const [activePillar, setActivePillar] = useState<string>('roots');

  const pillars = [
    {
      id: 'roots',
      title: 'BỘ RỄ',
      subtitle: 'Nền móng vững chắc',
      icon: Sprout,
      color: 'from-amber-600 to-amber-800',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      description: 'Tượng trưng cho nền móng đầu tiên, cho những thế hệ cán bộ đi trước đã âm thầm vun đắp và tạo những viên gạch đầu tiên cho sự hình thành, phát triển của Chi nhánh.'
    },
    {
      id: 'trunk',
      title: 'THÂN CÂY',
      subtitle: 'Ý chí & Bản lĩnh',
      icon: TreeDeciduous,
      color: 'from-amber-800 to-stone-800',
      badgeBg: 'bg-stone-100 text-stone-800 border-stone-300',
      description: 'Là bản lĩnh, ý chí và sự kiên định được tôi luyện qua từng giai đoạn khó khăn, thử thách.'
    },
    {
      id: 'branches',
      title: 'CÀNH LÁ',
      subtitle: 'Khát vọng vươn xa',
      icon: Leaf,
      color: 'from-brand-royal to-brand-sky',
      badgeBg: 'bg-blue-100 text-brand-royal border-blue-300',
      description: 'Vươn cao thể hiện khát vọng phát triển không ngừng, mở rộng quy mô hoạt động và khẳng định vị thế của VietinBank Bắc Hưng Yên.'
    },
    {
      id: 'symbols',
      title: 'NHỮNG BIỂU TƯỢNG VIETINBANK',
      subtitle: 'Trái ngọt tập thể',
      icon: Users,
      color: 'from-brand-red to-red-700',
      badgeBg: 'bg-red-100 text-brand-red border-red-300',
      description: 'Trên tán cây chính là hình ảnh của từng cán bộ nhân viên – những "trái ngọt" được tạo nên từ sự đoàn kết, nỗ lực và cống hiến của cả tập thể.'
    },
    {
      id: 'journey',
      title: 'HÀNH TRÌNH PHÁT TRIỂN',
      subtitle: 'Giá trị bền vững',
      icon: Sparkles,
      color: 'from-purple-600 to-indigo-700',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
      description: 'Của một cái cây cũng chính là hành trình của một tổ chức. Từ những hạt mầm suy nghĩ tốt đẹp hôm nay sẽ bén rễ thành hành động, lớn lên thành giá trị và đơm hoa thành thành công bền vững ngày mai.'
    }
  ];

  return (
    <section id="culture-tree" className="py-20 bg-gradient-to-b from-white via-[#F0F6FA] to-[#E6F0F8] border-y border-slate-200 relative overflow-hidden">
      {/* Decorative Cloud Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-200/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header Banner */}
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-red text-white font-black text-xs sm:text-sm uppercase tracking-widest shadow-md shadow-red-500/20 animate-pulse">
            <Award className="w-4 h-4 text-amber-300" />
            <EditableText id="culture.pill" defaultVal="Biểu Tượng Văn Hóa Đặc Trưng 20 Năm" className="font-black text-xs sm:text-sm uppercase tracking-widest" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-brand-royal tracking-tight uppercase leading-tight">
            <EditableText id="culture.title1" defaultVal="20 NĂM VUN GỐC BỀN RỄ" className="text-brand-royal" /> <br className="hidden sm:block" />
            <EditableText id="culture.title2" defaultVal="VƯƠN TẦM TƯƠNG LAI" className="text-brand-red" />
          </h2>

          <div className="inline-block px-6 py-1 bg-brand-royal text-white font-mono font-bold text-base sm:text-lg rounded-full shadow">
            <EditableText id="culture.years" defaultVal="2006 — 2026" className="font-mono font-bold" />
          </div>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl mx-auto pt-2">
            <EditableText
              id="culture.desc"
              defaultVal="Nhân dịp kỷ niệm 20 năm thành lập Chi nhánh (2006 – 2026), VietinBank Bắc Hưng Yên phát động chương trình thay ảnh đại diện Facebook/Zalo bằng khung hình kỷ niệm 20 năm như một cách lan tỏa niềm tự hào, tinh thần đoàn kết và dấu ấn đồng hành của mỗi cán bộ nhân viên với Chi nhánh thân yêu."
              multiline={true}
              as="span"
            />
          </p>

          {/* Official Culture Quote & Ambassadors Banner */}
          <div className="mt-8 bg-gradient-to-r from-brand-royal to-[#003d6e] p-6 sm:p-8 rounded-3xl text-white shadow-xl max-w-4xl mx-auto border border-blue-400/30 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            <div className="space-y-2 flex-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                <EditableText id="culture.quote_title" defaultVal="✨ Dấu ấn Văn hóa VietinBank Bắc Hưng Yên" className="font-black text-xs uppercase" />
              </span>
              <p className="text-lg sm:text-xl font-bold italic text-white drop-shadow leading-snug">
                <EditableText id="culture.quote" defaultVal="“Văn hóa đơn giản là: ở đây ai cũng vậy, Tin như vậy, Nghĩ như vậy và Làm như vậy”" multiline={true} as="span" />
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6 shrink-0 text-xs">
              <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-2xl backdrop-blur-md">
                <img src="https://i.ibb.co/FkT1KCLB/boss.jpg" alt="Trần Đức Anh" className="w-11 h-11 rounded-full object-cover border-2 border-amber-300" referrerPolicy="no-referrer" />
                <div>
                  <span className="text-[10px] text-amber-300 font-bold block uppercase">
                    <EditableText id="culture.ambassador_role" defaultVal="Đại sứ Văn hóa" className="font-bold text-[10px] uppercase" />
                  </span>
                  <strong className="text-white text-xs block">
                    <EditableText id="culture.ambassador_name" defaultVal="TRẦN ĐỨC ANH" className="text-white text-xs block font-bold" />
                  </strong>
                  <span className="text-blue-200 text-[10px]">
                    <EditableText id="culture.ambassador_dept" defaultVal="Giám đốc Chi nhánh" className="text-blue-200 text-[10px]" />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-2xl backdrop-blur-md">
                <img src="https://i.ibb.co/MyJ25pgN/z6553286835399-f082e4400149c9d9c99afd4857c92de8.jpg" alt="Nguyễn Thị Phượng" className="w-11 h-11 rounded-full object-cover border-2 border-amber-300" referrerPolicy="no-referrer" />
                <div>
                  <span className="text-[10px] text-amber-300 font-bold block uppercase">
                    <EditableText id="culture.nucleus_role" defaultVal="Hạt nhân Văn hóa" className="font-bold text-[10px] uppercase" />
                  </span>
                  <strong className="text-white text-xs block">
                    <EditableText id="culture.nucleus_name" defaultVal="NGUYỄN THỊ PHƯỢNG" className="text-white text-xs block font-bold" />
                  </strong>
                  <span className="text-blue-200 text-[10px]">
                    <EditableText id="culture.nucleus_dept" defaultVal="PP.TCTH" className="text-blue-200 text-[10px]" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Visual Tree Infographic Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Column: Roots, Trunk, Branches */}
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            {pillars.slice(0, 3).map((pillar) => {
              const Icon = pillar.icon;
              const isActive = activePillar === pillar.id;
              return (
                <div
                  key={pillar.id}
                  onClick={() => setActivePillar(pillar.id)}
                  className={`p-6 rounded-2xl bg-white border transition-all cursor-pointer relative overflow-hidden group ${isActive ? 'border-brand-royal shadow-xl scale-[1.02] ring-2 ring-brand-royal/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pillar.color} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-800 text-base uppercase tracking-tight group-hover:text-brand-royal transition-colors">
                          <EditableText id={`culture.pillar.${pillar.id}.title`} defaultVal={pillar.title} className="font-black uppercase text-base" />
                        </h3>
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${pillar.badgeBg} uppercase`}>
                        <EditableText id={`culture.pillar.${pillar.id}.subtitle`} defaultVal={pillar.subtitle} className="text-[10px] font-bold uppercase" />
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        <EditableText id={`culture.pillar.${pillar.id}.description`} defaultVal={pillar.description} multiline={true} as="span" className="text-xs text-slate-600 leading-relaxed" />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Column: The Symbolic Tree Visual Simulation */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2 py-6">
            <div className="relative w-full max-w-[360px] aspect-square flex items-center justify-center">

              {/* Glowing Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-royal/20 via-brand-sky/10 to-brand-red/10 rounded-full blur-2xl" />

              {/* Tree Structure Representation */}
              <div className="relative z-10 w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
                <svg width="0" height="0" className="absolute pointer-events-none">
                  <defs>
                    <filter id="remove-white" colorInterpolationFilters="sRGB">
                      <feColorMatrix
                        type="matrix"
                        values="1 0 0 0 0
                                0 1 0 0 0
                                0 0 1 0 0
                                -3 -3 -3 8.5 -0.1"
                      />
                    </filter>
                  </defs>
                </svg>
                <img
                  src="https://i.ibb.co/kV5cgsbp/c-y-k-c.jpg"
                  alt="Cây ký ức VietinBank Bắc Hưng Yên"
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                  style={{ filter: 'url(#remove-white)' }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-4 bg-brand-royal text-white px-5 py-2 rounded-2xl shadow-xl font-black text-xs tracking-wider uppercase border-2 border-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-red" />
                <EditableText id="culture.floating_badge" defaultVal="Văn Hóa Bắc Hưng Yên" className="font-black text-xs uppercase" />
              </div>
            </div>
          </div>

          {/* Right Column: Symbols & Journey */}
          <div className="lg:col-span-4 space-y-6 order-3">
            {pillars.slice(3, 5).map((pillar) => {
              const Icon = pillar.icon;
              const isActive = activePillar === pillar.id;
              return (
                <div
                  key={pillar.id}
                  onClick={() => setActivePillar(pillar.id)}
                  className={`p-6 rounded-2xl bg-white border transition-all cursor-pointer relative overflow-hidden group ${isActive ? 'border-brand-royal shadow-xl scale-[1.02] ring-2 ring-brand-royal/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pillar.color} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-800 text-base uppercase tracking-tight group-hover:text-brand-royal transition-colors">
                          <EditableText id={`culture.pillar.${pillar.id}.title`} defaultVal={pillar.title} className="font-black uppercase text-base" />
                        </h3>
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${pillar.badgeBg} uppercase`}>
                        <EditableText id={`culture.pillar.${pillar.id}.subtitle`} defaultVal={pillar.subtitle} className="text-[10px] font-bold uppercase" />
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        <EditableText id={`culture.pillar.${pillar.id}.description`} defaultVal={pillar.description} multiline={true} as="span" className="text-xs text-slate-600 leading-relaxed" />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Call to Action Card exact from Infographic */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-royal to-[#003B6F] text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Share2 className="w-32 h-32" />
              </div>
              <h4 className="font-black text-sm uppercase tracking-wide text-amber-300 mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-brand-red fill-current animate-pulse" />
                <EditableText id="culture.cta.title" defaultVal="Hãy Cùng Nhau Thay Ảnh Đại Diện!" className="font-black text-sm uppercase" />
              </h4>
              <p className="text-xs text-blue-100 mb-4 leading-relaxed">
                <EditableText id="culture.cta.desc" defaultVal="Mỗi ảnh đại diện được thay là một lời chúc mừng sinh nhật Chi nhánh, một niềm tự hào và một dấu ấn cùng đồng hành với cột mốc 20 năm đáng nhớ." multiline={true} as="span" />
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-400/30 text-[10px] text-center font-bold">
                <div className="bg-white/10 p-2 rounded-lg">
                  <span className="block text-amber-300 text-xs mb-0.5">
                    <EditableText id="culture.cta.step1_lbl" defaultVal="Bước 1" className="text-amber-300 text-[10px] block font-bold mb-0.5" />
                  </span>
                  <EditableText id="culture.cta.step1_val" defaultVal="Tải khung ảnh 20 năm" className="text-[10px]" />
                </div>
                <div className="bg-white/10 p-2 rounded-lg">
                  <span className="block text-amber-300 text-xs mb-0.5">
                    <EditableText id="culture.cta.step2_lbl" defaultVal="Bước 2" className="text-amber-300 text-[10px] block font-bold mb-0.5" />
                  </span>
                  <EditableText id="culture.cta.step2_val" defaultVal="Thay ảnh Facebook/Zalo" className="text-[10px]" />
                </div>
                <div className="bg-white/10 p-2 rounded-lg">
                  <span className="block text-amber-300 text-xs mb-0.5">
                    <EditableText id="culture.cta.step3_lbl" defaultVal="Bước 3" className="text-amber-300 text-[10px] block font-bold mb-0.5" />
                  </span>
                  <EditableText id="culture.cta.step3_val" defaultVal="Lan tỏa niềm tự hào" className="text-[10px]" />
                </div>
              </div>

              {/* Nút CTA: điều hướng tới khu vực thay ảnh đại diện (thay cho liên kết #avatar) */}
              <button
                type="button"
                onClick={onOpenAvatar}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.02]"
              >
                <span>Thay ảnh đại diện ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Footer Hashtag Ribbon exact from Infographic */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-black text-brand-royal">
          <span className="hover:text-brand-red transition-colors cursor-pointer">#VietinBankBacHungYen</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-brand-red transition-colors cursor-pointer">#20NamVunGocBenReVuonTamTuongLai</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-brand-red transition-colors cursor-pointer">#TuHaoVietinBankBacHungYen</span>
        </div>

      </div>
    </section>
  );
};
