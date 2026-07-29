import React, { useState } from 'react';
import { Upload, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';

interface TechnologyPillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
}

export const TechnologyPillar: React.FC<TechnologyPillarProps> = ({ images, onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const techImage2 = images?.[1] || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
      <div className="lg:col-span-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-100 text-brand-red text-xs font-black uppercase tracking-wider">
          <Zap className="w-4 h-4 text-amber-500" />
          <EditableText id="programs.technology.subject" defaultVal="#1. Công nghệ số & ứng dụng AI trên mọi hành trình" className="font-black text-xs uppercase text-brand-red" />
        </div>
        <h3 className="text-2xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight leading-tight">
          <EditableText id="programs.technology.title" defaultVal="Văn Hóa Làm Việc Thông Minh" className="font-black text-2xl sm:text-4xl uppercase" />
        </h3>

        <div className="bg-gradient-to-r from-red-50 via-amber-50 to-blue-50 p-5 rounded-3xl border-l-4 border-brand-red shadow-sm">
          <p className="text-sm font-bold italic text-slate-800 leading-relaxed">
            “<EditableText
              id="programs.technology.quote"
              defaultVal="Công nghệ không chỉ là công cụ, mà là văn hóa làm việc thông minh – nhanh hơn, sáng tạo hơn, hiệu quả hơn, đem lại trải nghiệm khách hàng xuất sắc và trải nghiệm cán bộ đầy xúc cảm."
              multiline={true}
              as="span"
            />”
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-black text-brand-royal uppercase block">
              <EditableText id="programs.technology.cx_title" defaultVal="📱 #3.1 Trải Nghiệm Khách Hàng (CX)" className="font-black text-xs uppercase" />
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              <EditableText
                id="programs.technology.cx_desc"
                defaultVal="Bảng welcome điện tử; Thiệp chúc mừng cá nhân hóa; Clip Onepage hướng dẫn SPDV ngắn gọn sinh động; Ký số hồ sơ nội bộ 100%; Khảo sát KH thường niên; Xếp hạng 4/18 CN KV2 Hành trình Chuyển đổi."
                multiline={true}
                as="span"
                className="text-xs"
              />
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-black text-brand-red uppercase block">
              <EditableText id="programs.technology.ex_title" defaultVal="💻 #3.2 Trải Nghiệm Cán Bộ (EX)" className="font-black text-xs uppercase" />
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              <EditableText
                id="programs.technology.ex_desc"
                defaultVal='Kit quà tặng chạm cảm xúc; Kanban online MIRO; APC soạn thảo mẫu biểu; 100% VB trình ký eOffice với 7,293 Văn bản nội bộ ký số; Dùng AI đào tạo và làm chủ AI; "Bac Hung Yen X01".'
                multiline={true}
                as="span"
                className="text-xs"
              />
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onImageUpload(1, event.target.result as string);
                  confetti({ particleCount: 40, spread: 50 });
                }
              };
              reader.readAsDataURL(file);
            }
          }}
          className={`relative group bg-slate-100 rounded-3xl overflow-hidden shadow-xl border-2 transition-all duration-300 min-h-[280px] flex flex-col justify-between ${
            isDragging ? 'border-brand-red scale-[1.02] bg-red-50/50' : 'border-slate-200'
          }`}
        >
          {/* Image background */}
          <img
            src={techImage2}
            alt="Uploaded technology cover"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Drag and Drop Active Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-20 bg-brand-red/15 backdrop-blur-[2px] flex items-center justify-center border-4 border-dashed border-brand-red rounded-3xl animate-pulse">
              <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl text-center">
                <Upload className="w-8 h-8 text-brand-red mx-auto mb-2 animate-bounce" />
                <span className="font-bold text-xs text-brand-red uppercase block tracking-wider">Thả ảnh tại đây!</span>
              </div>
            </div>
          )}

          {/* Dark gradient shadow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity duration-300 opacity-90 group-hover:opacity-100" />

          {/* UI Contents */}
          <div className="relative z-10 p-6 sm:p-8 h-full flex flex-col justify-between flex-1">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-900 rounded-lg font-black text-[10px] uppercase tracking-wider mb-3">
                📂 Khu vực tải lên hình ảnh
              </div>
              <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2 drop-shadow-md">
                ỨNG DỤNG CÔNG NGHỆ SỐ BHY
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed max-w-sm drop-shadow-sm">
                Kéo thả tệp ảnh vào đây hoặc bấm nút phía dưới để tải lên hình ảnh minh chứng/thiết kế về công nghệ số của bạn.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-lg hover:shadow-red-500/20 hover:scale-[1.03] transition-all select-none">
                <Upload className="w-4 h-4" />
                <span>Tải ảnh lên</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          onImageUpload(1, event.target.result as string);
                          confetti({ particleCount: 40, spread: 50 });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const url = window.prompt("Nhập URL hình ảnh trực tuyến:");
                  if (url) {
                    onImageUpload(1, url);
                    confetti({ particleCount: 40, spread: 50 });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/25 font-bold text-xs sm:text-sm shadow transition-all cursor-pointer hover:scale-[1.03]"
              >
                <span>Nhập URL</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-lg border border-slate-200">
          <img src={images[0]} alt="Digital eOffice AI" className="w-full h-full object-cover" />
          <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
        </div>
      </div>
    </div>
  );
};
