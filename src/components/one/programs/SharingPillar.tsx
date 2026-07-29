import React, { useState } from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { EditableText, useAdminEditable } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';

interface SharingPillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
  onOpenUploadModal: (defaultCategory: string) => void;
}

export const SharingPillar: React.FC<SharingPillarProps> = ({ images, onImageUpload, onOpenUploadModal }) => {
  const { isAdmin } = useAdminEditable();

  // --- Sharing Simulator State ---
  const [sharingTopic, setSharingTopic] = useState('');
  const [sharingDept, setSharingDept] = useState('Phòng KHDN');
  const [sharingSummary, setSharingSummary] = useState<string | null>(null);

  const generateSharingOnePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingTopic) return;
    setSharingSummary(`BẢN TÓM TẮT 01 TRANG (Phụ lục 01)
Chủ đề: ${sharingTopic}
Đơn vị chia sẻ: ${sharingDept}
Trọng tâm: Chuyển hóa văn bản/quy định thành case áp dụng thực tế tại Chi nhánh.
3 Ý chính cần nhớ: (1) Nhận diện điểm mới, (2) Lỗi thường gặp cần tránh, (3) Hành động áp dụng ngay hằng ngày.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      <div className="lg:col-span-7 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
          <EditableText id="programs.sharing.subject" defaultVal='Chủ điểm: "Học - Đọc - Đào Tạo"' className="font-bold text-xs" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-brand-navy">
          <EditableText id="programs.sharing.title" defaultVal="Bắc Hưng Yên Sharing" className="font-black text-2xl sm:text-3xl" />
        </h3>
        <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
          <EditableText
            id="programs.sharing.desc"
            defaultVal="Tạo cơ hội để cán bộ, lãnh đạo các phòng và Ban Giám đốc chia sẻ kiến thức thị trường, bài học thực tiễn và mô hình hay. Lan tỏa tinh thần học tập và đổi mới sáng tạo trong toàn Chi nhánh."
            multiline={true}
            as="span"
          />
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <span className="font-bold text-xs text-brand-navy uppercase block mb-1">
              <EditableText id="programs.sharing.prio_title" defaultVal="✅ Nội dung ưu tiên" className="font-bold text-xs uppercase" />
            </span>
            <div className="text-xs text-slate-600 space-y-1">
              <EditableText
                id="programs.sharing.prio_content"
                defaultVal="• Kiến thức KHDN FDI, khu/cụm công nghiệp.&#10;• Xử lý từối khách hàng & quản trị rủi ro.&#10;• Ứng dụng AI, Miro/Kanban, dữ liệu số.&#10;• Case study thực tế sau sai sót (near-miss)."
                multiline={true}
                as="span"
                className="whitespace-pre-line text-xs"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
            <span className="font-bold text-xs text-brand-red uppercase block mb-1">
              <EditableText id="programs.sharing.discourage_title" defaultVal="⚠️ Không khuyến khích" className="font-bold text-xs uppercase" />
            </span>
            <p className="text-xs text-slate-600">
              <EditableText
                id="programs.sharing.discourage_content"
                defaultVal="Không đọc lại văn bản, quy định thuần túy đã phân phối. Trường hợp liên quan văn bản mới, bắt buộc chuyển hóa thành tình huống áp dụng thực tế & lỗi dễ gặp."
                multiline={true}
                as="span"
                className="text-xs"
              />
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <div className="text-xs">
            <span className="font-bold text-slate-800">Tần suất:</span> <EditableText id="programs.sharing.frequency" defaultVal="Tối thiểu 02 lần/tháng (họp giao ban/chuyên đề)" className="text-xs" />
          </div>
          {isAdmin && (
            <button
              onClick={() => onOpenUploadModal('sharing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Đăng bài Sharing mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Sharing Simulator */}
      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
        <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <img src={images[0]} alt="BHY Sharing Illustration" className="w-full h-full object-cover" />
          <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
        </div>
        <div className="flex items-center gap-2 mb-4 border-b pb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h4 className="font-black text-slate-800 text-sm">Trình Tạo Bản Tóm Tắt Sharing 01 Trang</h4>
        </div>

        <form onSubmit={generateSharingOnePage} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tên chủ đề chia sẻ thực tế:</label>
            <input
              type="text"
              placeholder="VD: Kinh nghiệm khai thác KH tài khoản số..."
              value={sharingTopic}
              onChange={e => setSharingTopic(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Đơn vị chủ trì:</label>
            <select
              value={sharingDept}
              onChange={e => setSharingDept(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs outline-none"
            >
              <option value="Phòng KHDN">Phòng KHDN</option>
              <option value="Phòng KHBL">Phòng KHBL</option>
              <option value="Phòng TCTH">Phòng TCTH</option>
              <option value="Phòng HTTD">Phòng HTTD</option>
              <option value="PGD Văn Giang">PGD Văn Giang</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all"
          >
            Tạo khung chuẩn Phụ lục 01
          </button>
        </form>

        {sharingSummary && (
          <div className="mt-4 p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 whitespace-pre-line font-mono">
            {sharingSummary}
          </div>
        )}
      </div>
    </div>
  );
};
