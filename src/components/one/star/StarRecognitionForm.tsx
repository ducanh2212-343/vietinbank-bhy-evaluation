import React from 'react';
import { Info, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StarAwardForm } from './StarAwardForm';

// Khu "Ghi nhận Sao Xứng Đáng" trên cổng.
//
// Từ 08/2026 đường nhập qua form Lark TẠM HOÃN — cổng là nơi ghi nhận trực tiếp:
// lãnh đạo (Trưởng phòng / PGĐ / Ban Giám đốc / TCTH) thấy form tặng Sao thật
// (StarAwardForm) với số serial chọn từ pool đã bàn giao, chống trùng ở tầng CSDL.
// Cán bộ thường thấy khối giới thiệu cấu trúc ghi nhận + quyền phát Sao để đề
// xuất với Trưởng phòng.
//
// (Link form Lark cũ đã gỡ; nếu chi nhánh nối lại Lark, xem lịch sử git.)

export const StarRecognitionForm: React.FC = () => {
  const { isAdmin, isManager, isPgd } = useAuth();
  // Quyền phát Sao theo văn bản mục 2: Trưởng phòng (cán bộ phòng mình) và Ban
  // Giám đốc (toàn chi nhánh). TCTH là đầu mối tổng hợp, nhập hộ.
  const coQuyenPhatSao = isAdmin || isManager || isPgd;

  if (coQuyenPhatSao) return <StarAwardForm />;

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-amber-200 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wide">
          <Star className="w-5 h-5 fill-amber-400 text-amber-600" />
          <span>Ghi Nhận Sao Xứng Đáng</span>
        </div>
        <span className="text-2xs font-black px-2 py-0.5 rounded bg-blue-100 text-brand-navy">
          Ghi nhận trên cổng
        </span>
      </div>

      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-2xs leading-relaxed text-slate-600">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-navy shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p>
              <strong className="text-slate-800">Quyền phát Sao</strong> (văn bản triển khai, mục 2):
              Trưởng phòng ghi nhận và phát Sao cho cán bộ trong phòng mình; Ban Giám đốc phát Sao
              cho hành vi/kết quả nổi trội toàn Chi nhánh. Phòng TCTH là đầu mối theo dõi, đối soát.
            </p>
            <p>
              Mỗi Sao gắn với một hành vi/kết quả cụ thể, ghi theo cấu trúc ba vế:
              <strong className="text-slate-800"> “Cảm ơn [cá nhân/tập thể] — vì đã [hành vi cụ thể] — đem lại [kết quả cụ thể]”</strong>,
              và mang một <strong className="text-slate-800">số serial riêng</strong> in trên sao vật lý.
            </p>
            <p>
              Bạn có thành tích hoặc chứng kiến đồng nghiệp xứng đáng được ghi nhận?
              Hãy đề xuất với <strong className="text-slate-800">Trưởng phòng phụ trách</strong> —
              người có quyền ghi nhận sẽ vào chính trang này để trao Sao.
            </p>
            <p className="text-emerald-700 font-bold">
              Mỗi Sao hợp lệ: +0,5 điểm KPI (tối đa 10 điểm/năm) và tích lũy đổi quà trong
              Tủ Quà Tặng của Chi nhánh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
