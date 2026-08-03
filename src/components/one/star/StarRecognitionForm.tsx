import React, { useState } from 'react';
import { Star, QrCode, Send, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStarRecords } from './useStarRecords';
import { isCollectiveName } from './starParser';
import { useMyFullName } from '../useMyFullName';

// Form "Mô phỏng ghi nhận QR" — khác bản gốc: phiếu được GHI THẬT vào star_records
// (source='form', hiện trong tab Chi tiết của khối phân tích), không chỉ confetti rồi mất.
export const StarRecognitionForm: React.FC = () => {
  const { submitFormRecord } = useStarRecords();
  const myName = useMyFullName();
  const [recipient, setRecipient] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [givenStars, setGivenStars] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleGiveStar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    // Tách "Đ/c Nguyễn Văn A - Phòng KHDN" thành tên + phòng TRƯỚC khi xét tập thể
    const cleaned = recipient.replace(/^Đ\/c\s+/i, '');
    const parts = cleaned.split('-');
    const name = parts[0]?.trim() || 'Cán bộ ẩn danh';
    const department = parts.slice(1).join('-').trim() || 'Phòng KHDN';
    const ok = await submitFormRecord({
      name,
      department,
      stars: givenStars,
      reason: action,
      result,
      date: new Date().toISOString().slice(0, 10),
      sender: myName,
      serial: '',
      isCollective: isCollectiveName(name),
    });
    setSubmitting(false);
    if (!ok) return;
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setShowSuccess(true);
    setRecipient('');
    setAction('');
    setResult('');
    setGivenStars(1);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-amber-200 shadow-md relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wide">
          <QrCode className="w-5 h-5 text-brand-navy" />
          <span>Ghi Nhận Sao Xứng Đáng</span>
        </div>
        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-blue-100 text-brand-navy">
          Lưu vào hệ thống đối soát
        </span>
      </div>

      <form onSubmit={handleGiveStar} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Cảm ơn (Cá nhân / Tập thể):</label>
          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="Đ/c Nguyễn Văn A - Phòng KHDN, hoặc Tập thể phòng..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
            required
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Vì đã (Hành vi / Hành động cụ thể):</label>
          <input
            type="text"
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Hành động xuất sắc cụ thể..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
            required
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Đem lại (Kết quả / Thành tích định lượng):</label>
          <input
            type="text"
            value={result}
            onChange={e => setResult(e.target.value)}
            placeholder="Kết quả kinh doanh hoặc vận hành..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
            required
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Số lượng Sao ghi nhận:</label>
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
          <span className="text-[10px] font-extrabold uppercase text-amber-700 block mb-2">🎫 Bản xem trước Phiếu Ghi Nhận:</span>
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-navy via-blue-700 to-brand-royal text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <Send className="w-4 h-4 text-amber-300" />
          <span>{submitting ? 'Đang gửi...' : 'Xác Nhận & Ghi Nhận Sao'}</span>
        </button>

        {showSuccess && (
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-2 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Đã ghi nhận thành công! Phiếu đã lưu vào hệ thống đối soát (tab Chi tiết).</span>
          </div>
        )}
      </form>
    </div>
  );
};
