import React from 'react';
import { Shield, Phone, Sparkles, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-royal text-white border-t-2 border-brand-red">
      <div className="max-w-7xl mx-auto px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-8 px-3 bg-white text-brand-royal font-black tracking-tighter text-base rounded flex items-center shadow-sm">
                VietinBank
              </div>
              <span className="text-sm font-bold tracking-wide uppercase text-blue-100">
                Chi Nhánh Bắc Hưng Yên
              </span>
            </div>
            <p className="text-blue-100/80 leading-relaxed max-w-md">
              Hệ sinh thái kết nối các chương trình thúc đẩy đổi mới sáng tạo, chia sẻ tri thức nội bộ và bộ chiêu thức vận hành chuẩn mực hướng tới kỷ niệm 20 năm thành lập (2006 - 2026).
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-800/80 text-amber-300 font-bold text-[11px]">
              <Award className="w-3.5 h-3.5 text-brand-red" />
              <span>Vun Gốc Bền Rễ - Vươn Tầm Tương Lai</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-amber-300 text-xs border-b border-blue-400/30 pb-1.5">
              5 Chuyên Mục Đặc Trưng
            </h4>
            <ul className="space-y-1.5 text-blue-100/90 text-[11px]">
              <li>• Bắc Hưng Yên Sharing</li>
              <li>• Bắc Hưng Yên Quizzi</li>
              <li>• Bắc Hưng Yên Ideas</li>
              <li>• Bắc Hưng Yên Credit 360</li>
              <li>• Bắc Hưng Yên Connect & Library</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-amber-300 text-xs border-b border-blue-400/30 pb-1.5">
              Đầu Mối Liên Hệ & Hỗ Trợ
            </h4>
            <div className="space-y-1 text-blue-100/90 text-[11px]">
              <p>📍 Trụ sở: Phố Nối, Thị xã Mỹ Hào, Hưng Yên</p>
              <p>📞 Điện thoại: 0221 3943 888</p>
              <p>📧 Email: bhy@vietinbank.vn</p>
              <p className="text-amber-200 font-semibold pt-1">Hỗ trợ kỹ thuật: 1900 558 868</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar exact match with Design Polish */}
        <div className="pt-6 border-t border-blue-400/30 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs text-blue-100/80 gap-4">
          <div>© 2026 VietinBank Chi nhánh Bắc Hưng Yên - Đồng lòng vươn xa</div>
          <div className="flex flex-wrap gap-4 uppercase tracking-widest text-[10px]">
            <span className="hover:text-white cursor-pointer">Hướng dẫn sử dụng</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer">Quy định bảo mật</span>
            <span>•</span>
            <span className="opacity-70 italic flex items-center gap-1">
              <Shield className="w-3 h-3 text-brand-red" /> Hệ thống nội bộ bảo mật
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
