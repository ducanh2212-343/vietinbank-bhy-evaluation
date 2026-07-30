import React from 'react';
import { CheckCircle2, Share2 } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';

interface ConnectPillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
}

export const ConnectPillar: React.FC<ConnectPillarProps> = ({ images, onImageUpload }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
      <div className="lg:col-span-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 text-brand-royal text-xs font-black uppercase tracking-wider">
          <Share2 className="w-4 h-4 text-brand-red" />
          <EditableText id="programs.connect.subject" defaultVal="#2. VietinBank Bac Hung Yen Connect" className="font-black text-xs uppercase" />
        </div>
        <h3 className="text-2xl sm:text-4xl font-black text-brand-royal uppercase tracking-tight leading-tight">
          <EditableText id="programs.connect.title" defaultVal="Kết Nối Cùng Phát Triển" className="font-black text-2xl sm:text-4xl uppercase" />
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          <EditableText
            id="programs.connect.desc"
            defaultVal="Chương trình được triển khai từ tháng 10/2024, tổ chức thành công Hội nghị kết nối kinh doanh KHDN vào tháng 11/2024 chủ đề “Thu” tại Melia Ba Vì, duy trì kết nối và đem lại hiệu quả lớn cho Chi nhánh trong công tác kinh doanh năm 2024 và 6T đầu năm 2025. Tháng 03/2025 tiếp tục dấu ấn với Hội nghị KHBL chủ đề “Xuân”."
            multiline={true}
            as="span"
          />
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
          <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-royal shrink-0" />
            <EditableText id="programs.connect.feature1" defaultVal="Thư ngỏ, Thư mời hợp tác chuyên nghiệp" className="text-xs" />
          </div>
          <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-royal shrink-0" />
            <EditableText id="programs.connect.feature2" defaultVal="Profile / Hồ sơ năng lực kết nối chuẩn hóa" className="text-xs" />
          </div>
          <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-red shrink-0" />
            <EditableText id="programs.connect.feature3" defaultVal="Hội nghị kết nối thường niên (Thu - Xuân)" className="text-xs" />
          </div>
          <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-red shrink-0" />
            <EditableText id="programs.connect.feature4" defaultVal="Duy trì hỗ trợ chuỗi cung ứng đầu vào ra" className="text-xs" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 text-xs text-slate-700 leading-relaxed">
          <span className="font-extrabold text-brand-royal uppercase block mb-1">
            <EditableText id="programs.connect.competitive_title" defaultVal="🌟 Khẳng định lợi thế cạnh tranh:" className="font-extrabold text-brand-royal uppercase block mb-1" />
          </span>
          <EditableText
            id="programs.connect.competitive_content"
            defaultVal="Khách hàng chia sẻ các kế hoạch dự án KD, lựa chọn VietinBank BHY là đối tác đồng hành từ khâu pháp lý đến phương án tài chính. Chi nhánh kết nối KHM từ hệ sinh thái KH — Là công cụ cạnh tranh quan trọng không phải bằng giá."
            multiline={true}
            as="span"
            className="text-xs text-slate-700 leading-relaxed"
          />
        </div>
      </div>

      <div className="lg:col-span-6 space-y-6">
        <div className="bg-gradient-to-br from-brand-royal via-[#004275] to-[#002b4d] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <span className="text-amber-300 font-mono text-xs uppercase font-black block mb-4 tracking-wider">
            📈 Dấu Ấn Hội Nghị KHDN "Thu" (11/2024)
          </span>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/15">
              <span className="text-2xl sm:text-3xl font-black text-white block">+ 795</span>
              <span className="text-[11px] text-blue-200 font-bold block mt-0.5">Tỷ đồng đã cấp GHTD</span>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/15">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 block">~ 915</span>
              <span className="text-[11px] text-blue-200 font-bold block mt-0.5">Tỷ đồng chuẩn bị cấp</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-blue-100 font-medium">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span>• Khách hàng KHDN mới đã cấp GHTD:</span>
              <strong className="text-white font-black text-sm">6 KHDN</strong>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span>• KHDN đang xin dự án mới đồng hành:</span>
              <strong className="text-amber-300 font-black text-sm">3 KHDN</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>• Giao dịch chuỗi (NGK, bao bì, nhựa, gỗ...):</span>
              <strong className="text-white font-black text-sm">5 Nhóm KH</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200">
            <img src={images[0]} alt="Hội nghị kết nối khách hàng" className="w-full h-full object-cover" />
            <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
          </div>
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200">
            <img src={images[1]} alt="Hợp tác đồng hành" className="w-full h-full object-cover" />
            <PillarAdminUploader onUpload={(v) => onImageUpload(1, v)} />
          </div>
        </div>
      </div>
    </div>
  );
};
