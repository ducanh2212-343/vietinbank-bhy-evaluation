import React, { useState } from 'react';
import { Star, Copy, Check, ExternalLink, Info, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Khu "Ghi nhận Sao Xứng Đáng" trên cổng KHÔNG còn là ô nhập liệu.
//
// Quy trình thật của chi nhánh: Lãnh đạo phòng / Ban Giám đốc nhập phiếu trên form
// Lark; Lark tự đẩy nội dung sang Zalo OA của group toàn chi nhánh để vinh danh
// ngay. Form nhập trên cổng trước đây ghi thẳng vào star_records nhưng không ai
// dùng (0 phiếu source='form' sau hơn nửa năm) — giữ lại chỉ tạo ra một đường ghi
// nhận thứ hai, lệch với dữ liệu Lark mà Phòng TCTH dùng để đối soát.
//
// Vì vậy khối này chỉ còn hai việc, đều là việc cổng làm tốt hơn Lark:
//   1. Soạn đúng cấu trúc "Cảm ơn … / vì đã … / đem lại …" (mục 3 văn bản triển
//      khai) rồi copy sang form Lark.
//   2. Dẫn thẳng sang form Lark và nói rõ ai được quyền phát Sao.

/** Form ghi nhận Sao trên Lark — nguồn dữ liệu chính thức của chương trình */
export const LARK_STAR_FORM_URL =
  'https://mjpyvv19nv3a.jp.larksuite.com/share/base/form/shrjpTNPZx3bkLMdlSrJ0Hu1abb';

export const StarRecognitionForm: React.FC = () => {
  const { isAdmin, isManager, isPgd } = useAuth();
  // Quyền phát Sao theo văn bản: Trưởng phòng (cán bộ phòng mình) và Ban Giám đốc
  // (toàn chi nhánh). Cán bộ khác vẫn xem được cấu trúc để đề xuất với Trưởng phòng.
  const coQuyenPhatSao = isAdmin || isManager || isPgd;

  const [recipient, setRecipient] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [givenStars, setGivenStars] = useState(1);
  const [copied, setCopied] = useState(false);

  const loiGhiNhan =
    `Cảm ơn ${recipient || '...'}\n`
    + `vì đã ${action || '...'}\n`
    + `đem lại ${result || '...'}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(loiGhiNhan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-amber-200 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wide">
          <Star className="w-5 h-5 fill-amber-400 text-amber-600" />
          <span>Ghi Nhận Sao Xứng Đáng</span>
        </div>
        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-blue-100 text-brand-navy">
          Nhập trên Lark
        </span>
      </div>

      {/* Quy trình thật: Lark → Zalo OA → cổng đối soát */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-[11px] leading-relaxed text-slate-600 mb-5">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-navy shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p>
              <strong className="text-slate-800">Phiếu Sao được nhập trên form Lark của Chi nhánh</strong>,
              không nhập trên cổng. Sau khi gửi, Lark tự đẩy nội dung ghi nhận sang
              <strong className="text-slate-800"> Zalo OA của group toàn Chi nhánh</strong> để vinh danh ngay.
            </p>
            <p className="flex flex-wrap items-center gap-1.5 font-bold text-slate-700">
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">Form Lark</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 inline-flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> Zalo OA Chi nhánh
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">Phòng TCTH đối soát</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">Bảng tổng hợp dưới đây</span>
            </p>
            <p>
              <strong className="text-slate-800">Quyền phát Sao:</strong> Trưởng phòng ghi nhận cho cán bộ
              trong phòng mình; Ban Giám đốc ghi nhận cho hành vi/kết quả nổi trội toàn Chi nhánh.
              Phiếu phải được ghi nhận trên form <em>trước khi</em> tổ chức trao Sao.
            </p>
          </div>
        </div>
      </div>

      {/* Trợ giúp soạn lời ghi nhận đúng cấu trúc văn bản triển khai */}
      <div className="space-y-4 text-xs">
        <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
          Soạn lời ghi nhận đúng cấu trúc, rồi copy sang form Lark:
        </span>

        <div>
          <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-recipient">
            Cảm ơn (Cá nhân / Tập thể):
          </label>
          <input
            id="sxd-recipient"
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="Đ/c Nguyễn Văn A - Phòng KHDN, hoặc Tập thể phòng..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-action">
            Vì đã (Hành vi / Hành động cụ thể):
          </label>
          <input
            id="sxd-action"
            type="text"
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Hành động xuất sắc cụ thể..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-result">
            Đem lại (Kết quả / Thành tích định lượng):
          </label>
          <input
            id="sxd-result"
            type="text"
            value={result}
            onChange={e => setResult(e.target.value)}
            placeholder="Kết quả kinh doanh hoặc vận hành..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
          />
        </div>

        <div>
          <span className="block font-bold text-slate-700 mb-1">Số lượng Sao ghi nhận:</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setGivenStars(num)}
                className={`flex-1 py-2 rounded-xl border font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  givenStars === num ? 'bg-amber-500 text-white border-amber-600 shadow' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${givenStars === num ? 'fill-white' : 'fill-slate-400'}`} />
                <span>{num} Sao</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bản xem trước phiếu vàng */}
        <div className="mt-6 pt-4 border-t border-dashed border-amber-300">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase text-amber-700">🎫 Bản xem trước Phiếu Ghi Nhận:</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black transition-all cursor-pointer"
              title="Copy lời ghi nhận để dán sang form Lark"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã copy' : 'Copy lời ghi nhận'}</span>
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 text-slate-800 shadow-inner relative overflow-hidden">
            <div className="absolute top-2 right-2 flex">
              {Array.from({ length: givenStars }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-600" />
              ))}
            </div>
            <p className="text-xs leading-relaxed font-serif">
              “<strong className="text-brand-navy font-sans font-black">CẢM ƠN </strong> <span className="font-bold underline decoration-amber-500">{recipient || '...'}</span> <br />
              <strong className="text-slate-900 font-sans font-bold">vì đã: </strong> <span>{action || '...'}</span> <br />
              <strong className="text-emerald-800 font-sans font-bold">đem lại: </strong> <span className="font-bold text-red-600">{result || '...'}</span>”
            </p>
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-amber-200/80 pt-2">
              <span>Quyển ghi nhận Phòng TCTH</span>
              <span className="text-emerald-700 font-bold">+ {givenStars * 0.5} Điểm KPI</span>
            </div>
          </div>
        </div>

        <a
          href={LARK_STAR_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-navy via-blue-700 to-brand-royal text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-amber-300" />
          <span>Mở form Lark để ghi nhận Sao</span>
        </a>

        {!coQuyenPhatSao && (
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Bạn không thuộc nhóm được phân quyền phát Sao. Hãy gửi đề xuất ghi nhận
            tới Trưởng phòng phụ trách để được xem xét trao Sao.
          </p>
        )}
      </div>
    </div>
  );
};
