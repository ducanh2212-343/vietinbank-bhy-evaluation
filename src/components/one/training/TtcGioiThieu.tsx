import React from 'react';
import { Bell, CalendarDays, Columns3, EyeOff, Route, ScanFace, Smartphone, TreeDeciduous, Users } from 'lucide-react';

/**
 * GIỚI THIỆU TRAINING CENTER — vì sao Chi nhánh dựng một cấu phần đào tạo trên
 * cổng thay vì chạy bằng file rời, và cấu phần này phục vụ ai.
 *
 * Bày trên trang chủ của thương hiệu cho cả người ngoài chương trình: cán bộ
 * nào cũng sẽ có lúc đứng trong một chương trình (hội nhập, chuyên đề, quy
 * hoạch, duy trì) — đọc trước để khi được xếp vào thì không bỡ ngỡ.
 */

const NHOM_DOI_TUONG = [
  { nhom: 'Cán bộ mới', nhuCau: 'Nắm quy trình, sản phẩm và văn hoá làm việc trong 30–60 ngày đầu', chuongTrinh: 'Chương trình hội nhập 30 ngày; bộ bài rà soát cơ bản' },
  { nhom: 'Cán bộ cần nâng cấp chuyên môn', nhuCau: 'Bổ sung đúng khoảng trống đã lộ ra qua công việc thực tế', chuongTrinh: 'Chương trình theo chuyên đề: thẩm định tín dụng, dự án đầu tư, sản phẩm' },
  { nhom: 'Cán bộ quy hoạch', nhuCau: 'Chuyển từ làm chuyên môn sang quản trị công việc và quản trị người khác', chuongTrinh: 'Chương trình 10 ngày như bản đang chạy, điều chỉnh theo vị trí quy hoạch' },
  { nhom: 'Cán bộ quản lý đương nhiệm', nhuCau: 'Rà soát năng lực định kỳ và duy trì hành vi quản trị', chuongTrinh: 'Chương trình duy trì 30–60–90 ngày; tự soi định kỳ theo 08 tiêu chí' },
];

const NGUYEN_TAC = [
  { icon: Route, ten: 'Một cấu trúc cho mọi chương trình', mo: 'Một chương trình là tập hợp ngày; một ngày là tập hợp đầu việc có khung giờ, người phụ trách, thiết bị và nơi nộp. Chỉ thay nội dung, không thay khung.' },
  { icon: Smartphone, ten: 'Học viên tự tích, Ban Giám đốc nhìn thấy ngay', mo: 'Tiến độ hiện theo thời gian thực trên cổng — không ai phải hỏi «làm đến đâu rồi».' },
  { icon: Bell, ten: 'Thông báo chỉ ở bốn mốc', mo: 'Đủ đầu việc trong ngày · 20 phút trước phiên trình bày · 17:00 còn việc · một thang Bloom dưới 60%. Không bắn theo từng ô tích, để mỗi tin đến đều đáng đọc.' },
  { icon: EyeOff, ten: 'Tự suy ngẫm không vào bảng điểm', mo: 'Phần tự soi của học viên nằm ở vùng dữ liệu mà ngay cả quản trị cũng không đọc được nội dung — đó là điều kiện để học viên nói thật.' },
];

const MAN_HINH = [
  { icon: Route, ten: 'Lộ trình', mo: 'Dải ngày, lịch chi tiết theo giờ, ô tích hoàn thành, xem trước ngày mai.' },
  { icon: ScanFace, ten: 'Tự soi', mo: 'Phiếu 08 tiêu chí hai đợt, ví dụ thật, biểu đồ dịch chuyển, STOP–START–CONTINUE.' },
  { icon: Columns3, ten: 'Bảng việc', mo: 'Ba phiếu giao việc bảy ô, khoá chuẩn khi giao, nghiệm thu Đạt/Chưa đạt; Kanban 3 cột dùng chung với Chiêu thức 2.' },
  { icon: CalendarDays, ten: 'Lịch Ban Giám đốc', mo: 'Mọi khung giờ cần Giám đốc hoặc PGĐ có mặt, tổng phút mỗi ngày và tổng giờ cả đợt.' },
];

export const TtcGioiThieu: React.FC = () => (
  <div className="space-y-8">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#A8763E]/15 text-[#8A5E2C]">
          <TreeDeciduous className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-brand-navy">Nơi tổ chức và theo dõi mọi chương trình đào tạo, rèn luyện của Chi nhánh</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Lấy trục nội dung từ mô hình <b>Cây trưởng thành nghề nghiệp</b>: bốn tầng quản trị bản thân → công việc
            → người khác → hệ thống, năm loại vốn nghề nghiệp và sáu thang tư duy Bloom. Chương trình 10 ngày dành cho
            Trưởng phòng Khách hàng doanh nghiệp là chương trình đầu tiên chạy trên cấu phần này.
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      {NGUYEN_TAC.map((n) => (
        <article key={n.ten} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-navy/10 text-brand-navy">
            <n.icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-brand-navy">{n.ten}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{n.mo}</p>
          </div>
        </article>
      ))}
    </div>

    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy">
        <Users className="h-4 w-4" /> Bốn nhóm đối tượng phục vụ
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-2xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Nhóm</th>
              <th className="px-4 py-2.5">Nhu cầu đặc trưng</th>
              <th className="px-4 py-2.5">Chương trình dự kiến</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {NHOM_DOI_TUONG.map((r) => (
              <tr key={r.nhom}>
                <td className="px-4 py-2.5 font-semibold text-brand-navy">{r.nhom}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.nhuCau}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.chuongTrinh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-navy">Bốn màn hình làm việc</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MAN_HINH.map((m) => (
          <div key={m.ten} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <m.icon className="h-5 w-5 text-[#A8763E]" />
            <p className="mt-2 text-sm font-bold text-brand-navy">{m.ten}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{m.mo}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Thư viện 18 biểu mẫu (bản số và bản in) thuộc giai đoạn 2 — sẽ đặt trong kho tư liệu chung của cổng, gắn nhãn theo chương trình.
      </p>
    </div>
  </div>
);
