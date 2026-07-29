import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, HelpCircle, Sparkles, Trophy } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';
import { useAuth } from '@/hooks/useAuth';

interface QuizziPillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
}

// BHY Quizzi: phần thi thử mô phỏng ở bản nguồn đã được thay bằng thẻ dẫn link
// tới tính năng Quizzi thật của hệ thống tại route /quizzi.
export const QuizziPillar: React.FC<QuizziPillarProps> = ({ images, onImageUpload }) => {
  // Guest đối tác không vào được /quizzi — ẩn CTA
  const { isGuest } = useAuth();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      <div className="lg:col-span-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
          <EditableText id="programs.quizzi.subject" defaultVal="Không áp lực điểm số - Không tâm lý sợ sai" className="font-bold text-xs" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-brand-red">
          <EditableText id="programs.quizzi.title" defaultVal="Bắc Hưng Yên Quizzi" className="font-black text-2xl sm:text-3xl" />
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          <EditableText
            id="programs.quizzi.desc"
            defaultVal="Trắc nghiệm ngắn cập nhật kịp thời các quy định, sản phẩm mới. Tạo kênh giải thích lại các điểm trọng yếu giúp cán bộ nhớ lâu và áp dụng chuẩn xác hằng ngày."
            multiline={true}
            as="span"
          />
        </p>

        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm space-y-3">
          <span className="font-bold text-xs text-slate-800 uppercase block">
            <EditableText id="programs.quizzi.recom_title" defaultVal="🎯 Cơ cấu câu hỏi khuyến nghị" className="font-bold text-xs uppercase" />
          </span>
          <div className="text-xs text-slate-600 space-y-1">
            <EditableText
              id="programs.quizzi.recom_content"
              defaultVal="• Nhận biết trọng yếu: 30%&#10;• Hiểu đúng trách nhiệm: 25%&#10;• Tình huống áp dụng: 30%&#10;• Rủi ro/lỗi dễ gặp: 15%"
              multiline={true}
              as="span"
              className="whitespace-pre-line text-xs"
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-amber-50 p-4 rounded-xl border border-red-200">
          <span className="font-bold text-xs text-brand-red block mb-1">
            <EditableText id="programs.quizzi.reward_title" defaultVal="🎁 Cơ chế trao thưởng mỗi buổi Quizzi" className="font-bold text-xs block mb-1" />
          </span>
          <p className="text-xs text-slate-700">
            <EditableText
              id="programs.quizzi.reward_content"
              defaultVal="Trao thưởng trực tiếp cho Top 3 cán bộ có điểm cao nhất: Quán quân: 200.000đ | Á quân & Quý quân: 100.000đ. 10 Phòng luân phiên ra đề hàng tuần."
              multiline={true}
              as="span"
              className="text-xs"
            />
          </p>
        </div>
      </div>

      {/* Thẻ dẫn tới tính năng Quizzi thật (thay cho quiz mô phỏng 5 câu ở bản nguồn) */}
      <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border-2 border-red-200 shadow-lg relative space-y-4">
        <div className="relative h-40 rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <img src={images[0]} alt="BHY Quizzi Illustration" className="w-full h-full object-cover" />
          <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red via-red-700 to-brand-navy text-white p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <HelpCircle className="w-36 h-36" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tính năng chính thức</span>
            </div>

            <h4 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-snug">
              BHY Quizzi đã là tính năng thật trong hệ thống
            </h4>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              Không còn là bản mô phỏng — bạn có thể tham gia các kỳ thi Quizzi chính thức, làm bài, xem giải thích chi tiết và bảng xếp hạng ngay trong hệ thống.
            </p>

            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center pt-1">
              <div className="bg-white/10 p-2 rounded-lg border border-white/15">
                <Trophy className="w-4 h-4 text-amber-300 mx-auto mb-1" />
                <span>Bảng xếp hạng Top 3</span>
              </div>
              <div className="bg-white/10 p-2 rounded-lg border border-white/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
                <span>Chấm điểm tức thì</span>
              </div>
              <div className="bg-white/10 p-2 rounded-lg border border-white/15">
                <HelpCircle className="w-4 h-4 text-sky-300 mx-auto mb-1" />
                <span>Giải thích chi tiết</span>
              </div>
            </div>

            {!isGuest && (
              <Link
                to="/quizzi"
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-brand-red hover:bg-amber-50 font-black text-sm uppercase tracking-wide shadow-lg transition-all hover:scale-[1.02]"
              >
                <span>Vào thi Quizzi thật</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
