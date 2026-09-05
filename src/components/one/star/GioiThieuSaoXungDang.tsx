import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Handshake, PenLine, ScanLine, Trophy, ArrowRight, Boxes, BarChart3, Star,
  Hash, PackageCheck, Undo2, FileSpreadsheet, Users, Target, Wallet, HelpCircle,
  Clock, Gift, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * GIỚI THIỆU SAO XỨNG ĐÁNG — cách chơi chữ, phiếu giấy, vòng đời một ngôi sao,
 * và hai nhóm tính năng trên cổng (quản lý tập trung · vinh danh).
 *
 * Vì sao dựng khối này: màn giới thiệu cũ mở thẳng vào bảng phân bổ 412 sao và
 * tủ quà — hai thứ chỉ có nghĩa với người ĐÃ biết chương trình. Cán bộ mới,
 * và khách đối tác (đây là màn duy nhất mở cho khách), đọc xong vẫn không biết
 * ngôi sao trông thế nào, ai trao cho ai, và vì sao phải ghi lên cổng.
 *
 * Vì sao mở đầu bằng cách chơi chữ chứ không bằng định nghĩa: tên chương trình
 * vốn là một câu hỏi tu từ — bộ nhận diện gốc của Chi nhánh viết «Sao xứng
 * đáng?» rồi trả lời «SAO xứng đáng!». Hai chữ đó đọc được ba cách (vì sao ·
 * ngôi sao · làm sao), và ba cách đọc ấy chính là ba việc người trao phải làm.
 * Bày đúng trật tự đó thì người đọc nhớ được chương trình mà không cần học
 * thuộc quy trình.
 *
 * Vì sao đưa ảnh phiếu giấy lên sớm: Sao Xứng Đáng là vật thật — một tấm phiếu
 * bìa treo được, có số serial. Người chưa cầm tấm phiếu bao giờ thì mọi lời mô
 * tả đều mơ hồ; nhìn thấy mặt sau có ba dòng «Cảm ơn / Vì đã / Đem lại» là hiểu
 * ngay vì sao chương trình bắt ghi ba vế chứ không phải một lời khen chung.
 *
 * Cơ chế thưởng (điểm KPI, tủ quà, luật đổi quà) KHÔNG lặp ở đây — khối
 * StarWorthy2026 ngay bên dưới đã bày đủ. Khối này chỉ dẫn tới đó.
 *
 * Chữ trong file lấy từ bộ nhận diện chương trình của Chi nhánh; phần nào là
 * lời trích thì ghi rõ nguồn ngay tại chỗ.
 */

const ANH_PHIEU = {
  truoc: '/brand/sao-xung-dang-mat-truoc.webp',
  sau: '/brand/sao-xung-dang-mat-sau.webp',
};

interface CachDoc {
  ma: string;
  cau: string;
  nghia: string;
  giaiThich: string;
  icon: LucideIcon;
}

/**
 * Ba cách đọc hai chữ «Sao xứng đáng» — trục dẫn dắt cả màn giới thiệu.
 *
 * Đây không phải trò chữ nghĩa cho vui: mỗi cách đọc là một việc thật người
 * trao phải làm, và bỏ việc nào thì ngôi sao hỏng theo cách đó. Bỏ câu hỏi
 * «vì sao» thì thành trao đại; bỏ «làm sao» thì thành phiếu ghi qua loa.
 */
const BA_CACH_DOC: CachDoc[] = [
  {
    ma: 'vi-sao',
    cau: 'Sao xứng đáng?',
    nghia: '«Sao» là vì sao',
    giaiThich:
      'Trước khi trao, người trao phải trả lời được: vì sao người này xứng đáng? Chưa trả lời được thì chưa trao.',
    icon: HelpCircle,
  },
  {
    ma: 'ngoi-sao',
    cau: 'SAO xứng đáng!',
    nghia: '«Sao» là ngôi sao',
    giaiThich:
      'Trả lời được rồi thì trao một ngôi sao: tấm phiếu thật, có số riêng, viết tay và trao tận tay.',
    icon: Star,
  },
  {
    ma: 'lam-sao',
    cau: 'Làm sao cho xứng đáng?',
    nghia: '«Sao» là làm thế nào',
    giaiThich:
      'Viết đủ ba vế ở mặt sau rồi ghi lên cổng. Trao vội, viết qua loa thì ngôi sao chỉ còn là tờ giấy.',
    icon: PenLine,
  },
];

/** Ba việc chương trình muốn làm được — theo bộ nhận diện chương trình của Chi nhánh */
const BA_MUC_TIEU = [
  {
    ma: 'kip-thoi',
    icon: Clock,
    ten: 'Ghi nhận kịp thời',
    moTa: 'Việc tốt được nói ra ngay lúc nó xảy ra, không đợi tới kỳ tổng kết mới nhắc.',
  },
  {
    ma: 'xung-dang',
    icon: Gift,
    ten: 'Khen thưởng xứng đáng',
    moTa: 'Sao đổi được điểm KPI và quà thật, nên lời cảm ơn không dừng ở lời nói.',
  },
  {
    ma: 'moi-truong',
    icon: Users,
    ten: 'Môi trường làm việc tích cực',
    moTa: 'Cả Chi nhánh nhìn thấy việc tốt của nhau, thi đua sôi nổi và gắn kết hơn.',
  },
];

/**
 * Năm cánh sao — năm giá trị Văn hóa VietinBank.
 *
 * Lấy nguyên chữ từ bộ nhận diện «Biểu tượng Văn hóa» của Chi nhánh: hình ngôi
 * sao không phải hình trang trí, năm cánh là năm giá trị. Đây là câu trả lời
 * ngắn nhất cho «vì sao lại là ngôi sao chứ không phải cái khác».
 */
const NAM_CANH = ['Chính trực', 'Tận tâm', 'Thấu cảm', 'Trí tuệ', 'Thích ứng'];

interface BuocVongDoi {
  ma: string;
  icon: LucideIcon;
  ten: string;
  moTa: string;
  ai: string;
}

/**
 * Vòng đời một ngôi sao — từ lúc in ra tới lúc đổi thành quà.
 *
 * Đây là thứ tách Sao Xứng Đáng khỏi mọi hình thức khen thưởng khác của Chi
 * nhánh: ngôi sao có SỐ RIÊNG, nên đi tới đâu cũng truy được ai giữ, ai trao,
 * trao cho ai. Không có bước «ghi nhận lên cổng» thì tấm phiếu chỉ là tờ giấy.
 */
const VONG_DOI: BuocVongDoi[] = [
  {
    ma: 'in',
    icon: Printer,
    ten: 'In & đánh số',
    ai: 'Phòng TCTH',
    moTa: 'Mỗi phiếu mang một số riêng, vào sổ kho ngay từ lô in.',
  },
  {
    ma: 'ban-giao',
    icon: Handshake,
    ten: 'Bàn giao theo quý',
    ai: 'TCTH → Ban Giám đốc, Trưởng phòng',
    moTa: 'Giao theo dải số và theo mức của từng đơn vị, trước mồng 5 đầu quý.',
  },
  {
    ma: 'trao',
    icon: PenLine,
    ten: 'Viết ba vế & trao tận tay',
    ai: 'Người trao',
    moTa: 'Viết Cảm ơn – Vì đã – Đem lại lên mặt sau, ký tên, trao trực tiếp cho người nhận.',
  },
  {
    ma: 'ghi-nhan',
    icon: ScanLine,
    ten: 'Ghi nhận lên cổng',
    ai: 'Người trao',
    moTa: 'Nhập đúng số ghi trên phiếu; cổng đối chiếu sổ kho nên không trùng, không khống.',
  },
  {
    ma: 'vinh-danh',
    icon: Trophy,
    ten: 'Tích lũy & vinh danh',
    ai: 'Cả Chi nhánh',
    moTa: 'Sao vào bảng thi đua, cộng điểm KPI và đổi quà theo mốc.',
  },
];

interface NhomTinhNang {
  ma: string;
  icon: LucideIcon;
  ten: string;
  moTa: string;
  duongDan: string;
  nhanNut: string;
  /** Chỉ Phòng TCTH và quản trị hệ thống vào được màn này */
  chiTcth?: boolean;
  tinhNang: { icon: LucideIcon; ten: string; moTa: string }[];
}

const NHOM_TINH_NANG: NhomTinhNang[] = [
  {
    ma: 'quan-ly',
    icon: Boxes,
    ten: 'Quản lý tập trung kho sao',
    moTa:
      'Toàn bộ phiếu giấy của Chi nhánh nằm trong một sổ kho duy nhất trên cổng. Bất kỳ số nào cũng tra được đang ở đâu, ai giữ, đã tặng cho ai.',
    duongDan: '/one/ghi-nhan/quan-ly',
    nhanNut: 'Vào khu quản lý & bàn giao',
    chiTcth: true,
    tinhNang: [
      {
        icon: Hash,
        ten: 'Sổ kho theo dải serial',
        moTa: 'Nhập lô in theo dải số; mỗi số chỉ có một lần trong toàn hệ thống.',
      },
      {
        icon: PackageCheck,
        ten: 'Bàn giao & tồn kho',
        moTa: 'Giao dải số cho từng lãnh đạo, phòng; luôn biết còn bao nhiêu sao chưa tặng.',
      },
      {
        icon: Undo2,
        ten: 'Thu hồi số chưa tặng',
        moTa: 'Cuối kỳ thu lại những số chưa dùng, trả về kho thay vì để thất lạc.',
      },
      {
        icon: FileSpreadsheet,
        ten: 'Đối soát sổ sao',
        moTa: 'So phiếu giấy với dữ liệu cổng, xuất Excel để kiểm tra và lưu hồ sơ.',
      },
    ],
  },
  {
    ma: 'vinh-danh',
    icon: BarChart3,
    ten: 'Vinh danh & thi đua',
    moTa:
      'Ngôi sao trao đi không dừng ở lời cảm ơn: nó lên bảng tổng hợp của Chi nhánh, thành điểm thi đua của phòng và thành mốc quà của cá nhân.',
    duongDan: '/one/ghi-nhan/tong-hop',
    nhanNut: 'Xem bảng tổng hợp & thi đua',
    tinhNang: [
      {
        icon: Star,
        ten: 'Sổ ghi nhận toàn Chi nhánh',
        moTa: 'Mọi phiếu đã trao, kèm ba vế Cảm ơn – Vì đã – Đem lại, ai cũng đọc được.',
      },
      {
        icon: Users,
        ten: 'Thi đua giữa các phòng',
        moTa: 'Xếp hạng số sao từng phòng nhận được, so với phòng dẫn đầu.',
      },
      {
        icon: Target,
        ten: 'Mốc quà của từng người',
        moTa: 'Mỗi cán bộ thấy mình đang ở mốc nào, còn thiếu mấy sao để lên mốc sau.',
      },
      {
        icon: Wallet,
        ten: 'Dự trù kinh phí quà',
        moTa: 'Cộng sẵn giá trị quy đổi theo mốc để Chi nhánh cân đối ngân sách.',
      },
    ],
  },
];

/** Ba vế bắt buộc trên mặt sau phiếu — chú thích cho ảnh */
const BA_VE = [
  { nhan: 'Cảm ơn', giaiThich: 'Tên người hoặc tập thể được cảm ơn.' },
  { nhan: 'Vì đã', giaiThich: 'Việc cụ thể họ đã làm — không phải lời khen chung chung.' },
  { nhan: 'Đem lại', giaiThich: 'Kết quả thật việc đó mang lại: số dư, khách hàng, tiến độ.' },
];

/** Thẻ ảnh một mặt phiếu — nền trắng bo tròn để ảnh trong suốt nổi trên nền vàng */
function MatPhieu({ src, alt, nhan }: { src: string; alt: string; nhan: string }) {
  return (
    <figure className="m-0">
      <div className="rounded-3xl border border-amber-200 bg-white p-3 shadow-sm sm:p-4">
        {/* width/height khai sẵn để trình duyệt giữ chỗ, tránh trang giật khi ảnh về */}
        <img
          src={src}
          alt={alt}
          width={668}
          height={672}
          loading="lazy"
          decoding="async"
          className="mx-auto block h-auto w-full max-w-[340px]"
        />
      </div>
      <figcaption className="mt-2 text-center text-xs font-black uppercase tracking-wider text-amber-800">
        {nhan}
      </figcaption>
    </figure>
  );
}

export const GioiThieuSaoXungDang: React.FC = () => {
  const { isGuest, roles } = useAuth();
  const laTcth = roles.includes('tcth_admin') || roles.includes('system_admin');
  // Khách đối tác chỉ được vào màn giới thiệu này, mọi màn nghiệp vụ đều khóa —
  // nên với khách thì mô tả tính năng vẫn hiện, chỉ bỏ nút dẫn vào cửa đã khóa.
  const [matDangXem, setMatDangXem] = useState<'truoc' | 'sau'>('sau');

  return (
    <div className="space-y-10 text-left">
      {/* ---------- 1. Ba cách đọc hai chữ «Sao xứng đáng» ---------- */}
      <section className="rounded-3xl border-2 border-brand-navy/15 bg-brand-navy p-6 shadow-lg sm:p-8">
        <h2 className="text-balance text-2xl font-black tracking-tight text-white sm:text-3xl">
          Tên chương trình là một câu hỏi
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100">
          Hai chữ <strong className="font-black text-white">«Sao xứng đáng»</strong> đọc được ba cách. Ba cách
          đọc ấy cũng chính là ba việc người trao phải làm — nhớ được ba câu này là hiểu cả chương trình.
        </p>

        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {BA_CACH_DOC.map((c, i) => (
            <li
              key={c.ma}
              className="relative flex h-full flex-col rounded-2xl bg-white/10 p-5 ring-1 ring-inset ring-white/15"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-brand-navy"
                >
                  <c.icon className="h-[18px] w-[18px]" />
                </span>
                {/* Số thứ tự cũng là nhãn: ba câu phải đọc theo đúng trật tự */}
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Cách đọc {i + 1}
                </span>
              </div>
              <p className="mt-3 text-lg font-black leading-snug text-amber-300 sm:text-xl">{c.cau}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-blue-200">{c.nghia}</p>
              <p className="mt-2 text-xs leading-relaxed text-blue-50">{c.giaiThich}</p>
              {i < BA_CACH_DOC.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-amber-400 md:block"
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 2. Ba việc chương trình muốn làm được ---------- */}
      <section>
        <h2 className="text-xl font-black tracking-tight text-brand-navy sm:text-2xl">
          Chương trình để làm gì
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Ba việc, nói gọn trong ba dòng.
        </p>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {BA_MUC_TIEU.map((m) => (
            <li key={m.ma} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <span
                aria-hidden
                className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-700"
              >
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-black leading-snug text-slate-900">{m.ten}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{m.moTa}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 3. Phiếu Sao bản giấy ---------- */}
      <section className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white p-6 shadow-lg sm:p-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            {/* Máy tính bày cả hai mặt; điện thoại bày một mặt kèm nút đổi để
                không phải cuộn qua hai tấm ảnh lớn mới tới phần chữ */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-2">
              <MatPhieu src={ANH_PHIEU.truoc} alt="Mặt trước phiếu Sao Xứng Đáng: ngôi sao vàng, viền in chữ Sao Xứng Đáng" nhan="Mặt trước" />
              <MatPhieu src={ANH_PHIEU.sau} alt="Mặt sau phiếu Sao Xứng Đáng: ba dòng Cảm ơn, Vì đã, Đem lại và chỗ ký tên" nhan="Mặt sau" />
            </div>
            <div className="sm:hidden">
              <MatPhieu
                src={matDangXem === 'truoc' ? ANH_PHIEU.truoc : ANH_PHIEU.sau}
                alt={
                  matDangXem === 'truoc'
                    ? 'Mặt trước phiếu Sao Xứng Đáng: ngôi sao vàng, viền in chữ Sao Xứng Đáng'
                    : 'Mặt sau phiếu Sao Xứng Đáng: ba dòng Cảm ơn, Vì đã, Đem lại và chỗ ký tên'
                }
                nhan={matDangXem === 'truoc' ? 'Mặt trước' : 'Mặt sau'}
              />
              <div className="mt-3 flex justify-center gap-1 rounded-2xl bg-white p-1">
                {(['truoc', 'sau'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMatDangXem(m)}
                    aria-pressed={matDangXem === m}
                    className={`min-h-[44px] flex-1 rounded-xl px-4 text-xs font-black transition-colors duration-200 ${
                      matDangXem === m ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {m === 'truoc' ? 'Mặt trước' : 'Mặt sau'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-800">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
              Phiếu Sao bản giấy
            </span>
            <h2 className="mt-3 text-balance text-2xl font-black tracking-tight text-brand-navy sm:text-3xl">
              Một ngôi sao là một vật thật, có số riêng
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Sao Xứng Đáng không phải lời khen nói miệng. Mỗi ngôi sao là một tấm phiếu bìa treo được,
              mang <strong className="font-black text-slate-900">một số riêng không trùng với phiếu nào</strong> —
              nhờ số đó Chi nhánh biết phiếu đang ở đâu, ai trao, trao cho ai. Người trao viết tay lên mặt sau,
              trao tận tay người nhận, rồi ghi lên cổng theo đúng số đó.
            </p>

            <p className="mt-6 text-[11px] font-black uppercase tracking-widest text-slate-500">
              Mặt sau phải viết đủ ba vế
            </p>
            <ol className="mt-2 space-y-2">
              {BA_VE.map((v, i) => (
                <li key={v.nhan} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500 text-xs font-black text-white"
                  >
                    {i + 1}
                  </span>
                  <p className="min-w-0 text-xs leading-relaxed text-slate-600">
                    <span className="font-black text-slate-900">{v.nhan}</span> — {v.giaiThich}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Đủ ba vế thì một năm sau đọc lại vẫn hiểu: việc gì đã được ghi nhận, và việc đó đem lại gì.
            </p>
          </div>
        </div>

        {/* Năm cánh sao — trả lời «vì sao lại là ngôi sao». Đặt cuối khối phiếu
            giấy vì người đọc vừa nhìn thấy hình ngôi sao ngay phía trên. */}
        <div className="mt-8 rounded-2xl border border-amber-200 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-black text-brand-navy">Vì sao lại là ngôi sao — và vì sao năm cánh</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Ngôi sao không phải hình vẽ cho đẹp. Năm cánh sao là năm giá trị Văn hóa VietinBank — trao một
            ngôi sao là nói rằng người kia vừa sống đúng những giá trị này.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {NAM_CANH.map((gt) => (
              <li
                key={gt}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900"
              >
                <Star aria-hidden className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                {gt}
              </li>
            ))}
          </ul>
          <blockquote className="mt-4 border-l-2 border-amber-400 pl-3 text-xs italic leading-relaxed text-slate-600">
            «Trên bầu trời rộng lớn mang tên VietinBank, với muôn ngàn vì tinh tú, Chi nhánh Bắc Hưng Yên tự
            hào là một ngôi sao nhỏ bé, lấp lánh trên bầu trời rộng lớn ấy.»
            <footer className="mt-1.5 not-italic text-[11px] font-bold text-slate-500">
              Đại sứ Văn hóa — Giám đốc Chi nhánh
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ---------- 4. Vòng đời một ngôi sao ---------- */}
      <section>
        <h2 className="text-xl font-black tracking-tight text-brand-navy sm:text-2xl">
          Một ngôi sao đi qua năm chặng
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Từ lô in của Phòng TCTH tới mốc quà của cán bộ — mỗi chặng có người chịu trách nhiệm rõ ràng.
        </p>

        {/* Xếp dọc trên điện thoại, ngang trên máy tính. Mũi tên chỉ hiện ở bản
            ngang: ở bản dọc thứ tự đã rõ nhờ số chặng, thêm mũi tên chỉ rối. */}
        <ol className="mt-5 grid gap-3 md:grid-cols-5">
          {VONG_DOI.map((b, i) => (
            <li key={b.ma} className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"
                >
                  <b.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Chặng {i + 1}
                </span>
              </div>
              <h3 className="mt-2.5 text-sm font-black leading-snug text-slate-900">{b.ten}</h3>
              <p className="mt-0.5 text-[11px] font-bold text-amber-700">{b.ai}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{b.moTa}</p>
              {i < VONG_DOI.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-amber-400 md:block"
                />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Sao đổi được gì — điểm KPI, các mốc quà và luật đổi quà — xem ngay bảng bên dưới.
        </p>
      </section>

      {/* ---------- 5. Hai nhóm tính năng trên cổng ---------- */}
      <section>
        <h2 className="text-xl font-black tracking-tight text-brand-navy sm:text-2xl">
          Cổng làm giúp Chi nhánh hai việc
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Trước đây sao phát ra được theo dõi bằng sổ tay và trí nhớ; nay cả kho sao lẫn kết quả thi đua
          nằm trên một nơi, ai cũng tra được.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {NHOM_TINH_NANG.map((nhom) => {
            // Khách đối tác và cán bộ thường không vào được khu TCTH — bày nút
            // dẫn vào cửa khóa chỉ khiến người bấm tưởng mình bị lỗi quyền
            const hienNut = !isGuest && (!nhom.chiTcth || laTcth);
            return (
              <div key={nhom.ma} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-navy text-white"
                  >
                    <nhom.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black leading-snug text-brand-navy">{nhom.ten}</h3>
                    {nhom.chiTcth && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                        Phòng TCTH
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{nhom.moTa}</p>

                <ul className="mt-4 grid flex-1 gap-2.5 sm:grid-cols-2">
                  {nhom.tinhNang.map((t) => (
                    <li key={t.ten} className="rounded-2xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <t.icon className="h-4 w-4 shrink-0 text-amber-600" />
                        {t.ten}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{t.moTa}</p>
                    </li>
                  ))}
                </ul>

                {hienNut && (
                  <Link
                    to={nhom.duongDan}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-black text-white shadow-sm transition-colors duration-200 hover:bg-amber-600"
                  >
                    {nhom.nhanNut}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
