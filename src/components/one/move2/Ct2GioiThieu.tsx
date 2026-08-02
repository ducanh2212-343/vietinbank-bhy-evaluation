import { useState } from 'react';
import { ChevronDown, Compass, Grid3x3, RefreshCw, Target } from 'lucide-react';

/**
 * Dải giới thiệu phương pháp của Chiêu thức 2.
 *
 * VẤN ĐỀ ĐANG SỬA: trên điện thoại, bốn thẻ SWOT → TOWS → 5W2H → PDCA xếp dọc
 * chiếm gần bốn màn hình. Cán bộ mở trang mỗi sáng để GHI NHỊP, nhưng phải vuốt
 * qua bốn màn lý thuyết mới thấy bảng Kanban. Lý thuyết đọc một lần là nhớ; cái
 * phải làm mỗi ngày mới cần đặt ở trên.
 *
 * CÁCH SỬA — thu gọn theo chiều dọc, đẩy sang chiều ngang:
 *   · Điện thoại: bốn thẻ thành một dải TRƯỢT NGANG có điểm neo (snap), cao đúng
 *     một thẻ. Đoạn mô tả dài gập lại sau nút «Xem thêm».
 *   · Màn hình rộng: giữ nguyên lưới bốn cột như cũ — ở đó không thiếu chỗ.
 *
 * Cùng một markup, chỉ khác lớp responsive: không dựng hai cây DOM để rồi lệch
 * nhau mỗi lần sửa nội dung.
 */

const BUOC = [
  {
    icon: Compass,
    ten: 'SWOT',
    mo: 'Nhìn thẳng vào nội tại: điểm mạnh, điểm yếu của Phòng và cơ hội, thách thức từ địa bàn.',
  },
  {
    icon: Grid3x3,
    ten: 'TOWS',
    mo: 'Ghép cặp các yếu tố để ra hướng đi: lấy điểm mạnh đón cơ hội, khắc phục điểm yếu trước thách thức.',
  },
  {
    icon: Target,
    ten: '5W2H',
    mo: 'Biến hướng đi thành đầu việc cụ thể, DUY NHẤT một người chịu trách nhiệm: What · Why · When · Where · Who · How · How much.',
  },
  {
    icon: RefreshCw,
    ten: 'PDCA',
    mo: 'Nhịp mỗi sáng trên chính thẻ việc — Plan, Do, Check, Act — vòng PDCA khép ở từng thẻ, không nằm trên giấy.',
  },
];

export function Ct2GioiThieu() {
  const [moRong, setMoRong] = useState(false);

  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <p className="text-2xs font-semibold uppercase tracking-widest text-brand-red">Chiêu thức số 2</p>
        <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-brand-navy sm:mt-2 sm:text-3xl lg:text-4xl">
          Kế hoạch hành động — Kanban 5W2H + PDCA
        </h1>

        {/* Một câu chốt luôn hiện; phần diễn giải gập lại trên điện thoại */}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
          «Bí kíp bỏ túi» của các Phòng: SWOT → TOWS → 5W2H, theo dõi bằng nhịp PDCA mỗi sáng
          7h00–8h00 ngay trên thẻ việc.
          <span className={moRong ? '' : 'hidden sm:inline'}>
            {' '}Đây là tấm gương soi cho chính mình trước, báo cáo cho lãnh đạo sau.
            Duy trì từ tháng 2/2024.
          </span>
        </p>

        <button
          type="button"
          onClick={() => setMoRong((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-navy sm:hidden"
          aria-expanded={moRong}
        >
          {moRong ? 'Thu gọn' : 'Xem thêm'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moRong ? 'rotate-180' : ''}`} />
        </button>

        {/*
          Điện thoại: dải trượt ngang, mỗi thẻ chiếm 80% bề ngang nên luôn ló ra
          một phần thẻ kế tiếp — đó là tín hiệu «còn nữa, vuốt đi» rõ hơn mọi mũi
          tên. Màn rộng: lưới như cũ.
        */}
        <div
          className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {BUOC.map(({ icon: Icon, ten, mo }, i) => (
            <div
              key={ten}
              className="w-[80%] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:w-auto sm:p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-navy/10 text-brand-navy">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-2xs font-semibold tabular-nums text-slate-400">Bước {i + 1}</span>
              </div>
              <p className="text-sm font-semibold text-brand-navy">{ten}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{mo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
