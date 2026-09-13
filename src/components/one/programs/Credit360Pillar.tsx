import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';
import { useAuth } from '@/hooks/useAuth';

interface Credit360PillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
  /** Trang đặc trưng chỉ giới thiệu — nơi làm việc thật là /one/credit-360 (một chức năng một cửa) */
  introOnly?: boolean;
  /**
   * Khối chèn dưới phần giới thiệu — hiện dùng cho sơ đồ vận hành.
   *
   * Nhận qua prop chứ không nhúng thẳng vào đây: sơ đồ vận hành đọc từ
   * `vanHanhChuongTrinh.ts` và sẽ dùng cho cả sáu thương hiệu Ways, còn file này
   * là của riêng Credit 360. Nhúng thẳng thì thương hiệu thứ hai phải chép lại.
   */
  giuaHaiKhoi?: React.ReactNode;
}

export const Credit360Pillar: React.FC<Credit360PillarProps> = ({ images, onImageUpload, introOnly, giuaHaiKhoi }) => {
  const { isGuest } = useAuth();

  // --- Credit 360 Simulator State ---
  const [creditType, setCreditType] = useState<'KHDN' | 'KHBL'>('KHDN');
  const [creditAmount, setCreditAmount] = useState<number>(18);
  const [timemarkVerified, setTimemarkVerified] = useState(false);

  const threshold = creditType === 'KHDN' ? 15 : 10;
  const qualifies = creditAmount >= threshold && timemarkVerified;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <EditableText id="programs.credit360.subject" defaultVal="Trao đổi nghiệp vụ nội bộ 360° - Không làm thay quyết định phê duyệt" className="font-bold text-xs text-emerald-800" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700">
            <EditableText id="programs.credit360.title" defaultVal="Bắc Hưng Yên Credit 360" className="font-black text-2xl sm:text-3xl text-emerald-700" />
          </h3>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            <EditableText
              id="programs.credit360.desc"
              defaultVal="Tạo môi trường thảo luận đa chiều đối với các hồ sơ đề xuất GHTD phức tạp trước khi trình cấp thẩm quyền. Giúp đội ngũ cán bộ QHKH rèn tư duy trình bày, phản biện và nhận diện rủi ro."
              multiline={true}
              as="span"
            />
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-sm">
              <EditableText id="programs.credit360.corp_segment" defaultVal="🏢 Phân khúc KHDN&#10;Áp dụng hồ sơ cấp mới/tái cấp có tổng GHTD từ 15 tỷ đồng trở lên." className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-sm">
              <EditableText id="programs.credit360.retail_segment" defaultVal="🛍️ Phân khúc KHBL&#10;Áp dụng hồ sơ cấp mới/tái cấp có tổng GHTD từ 10 tỷ đồng trở lên." className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border">
            <span className="font-bold text-xs text-slate-800 block mb-1">
              <EditableText id="programs.credit360.schedule_title" defaultVal="📅 Khung giờ ưu tiên triệu tập" className="font-bold text-xs block" />
            </span>
            <p className="text-xs text-slate-600">
              <EditableText
                id="programs.credit360.schedule_content"
                defaultVal="Chiều thứ 2, Sáng thứ 3 hoặc ngày thứ 5 hằng tuần. Cán bộ trình bày gửi hồ sơ trước tối thiểu 03 ngày. Bắt buộc minh chứng ảnh cơ sở kinh doanh/TSBĐ chụp qua ứng dụng Timemark."
                multiline={true}
                as="span"
                className="text-xs"
              />
            </p>
          </div>
        </div>

        {/* Credit 360 Checklist Simulator */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-emerald-300 shadow-md space-y-4">
          <div className="relative h-40 rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <img src={images[0]} alt="BHY Credit 360 Illustration" className="w-full h-full object-cover" />
            <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
          </div>
          <h4 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            <span>Checklist Kiểm Tra Điều Kiện Đưa Vào Phiên Credit 360</span>
          </h4>

          <div className="space-y-4 text-xs mb-6">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân khúc Khách hàng:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={creditType === 'KHDN'} onChange={() => setCreditType('KHDN')} className="text-emerald-600" />
                  <span className="font-semibold">Khách hàng Doanh nghiệp (KHDN)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={creditType === 'KHBL'} onChange={() => setCreditType('KHBL')} className="text-emerald-600" />
                  <span className="font-semibold">Khách hàng Bán lẻ (KHBL)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tổng GHTD đề xuất (Tỷ VNĐ):</label>
              <input
                type="number"
                value={creditAmount}
                onChange={e => setCreditAmount(Number(e.target.value))}
                className="w-full p-2 border rounded text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input type="checkbox" checked={timemarkVerified} onChange={e => setTimemarkVerified(e.target.checked)} className="rounded text-emerald-600" />
                <span>Đã chụp Timemark xác thực vị trí nhà xưởng/TSBĐ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                <span>Đã thu thập đánh giá 360° khách hàng từ CRM 1.0</span>
              </label>
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`p-4 rounded-xl border text-center ${qualifies ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
            <span className="font-black text-sm block mb-1">
              {qualifies ? '✅ ĐỦ ĐIỀU KIỆN ĐƯA VÀO PHIÊN THẢO LUẬN' : 'ℹ️ Chưa đủ ngưỡng bắt buộc hoặc thiếu Timemark'}
            </span>
            <p className="text-[11px] opacity-90">
              {qualifies
                ? `Hồ sơ ${creditType} GHTD ${creditAmount} tỷ >= ${threshold} tỷ. Sẵn sàng sắp xếp calendar triệu tập Hội đồng 360°.`
                : `Ngưỡng tối thiểu cho ${creditType} là ${threshold} tỷ VNĐ và yêu cầu xác thực Timemark.`}
            </p>
          </div>
        </div>
      </div>

      {/* Sơ đồ vận hành nằm ngay dưới phần giới thiệu: đọc xong «chương trình
          là gì» thì tới «chạy thế nào». Khách đối tác không thấy — biểu mẫu và
          mốc nội bộ là việc của cán bộ.

          Sổ nhật ký phiên (form đăng ký + bảng tra cứu, bảng portal_credit_sessions)
          từng nằm ở đây đã gỡ 09/2026 theo yêu cầu Giám đốc: không ai dùng — phiên
          được đăng ký với Người điều phối / phòng TCTH và ghi biên bản giấy theo
          Mẫu biểu 01, cổng không phải nơi ghi. Bảng dữ liệu vẫn còn trên máy chủ,
          gỡ bảng là việc của một migration riêng. */}
      {!introOnly && !isGuest && giuaHaiKhoi}
    </div>
  );
};
