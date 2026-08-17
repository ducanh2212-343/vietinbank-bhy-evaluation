import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardPen, Info, Search, Send } from 'lucide-react';
import { khopTimKiem } from '@/lib/vietnamese';
import { chamPhieuBenRe, phieuBenReRong, phieuCoNoiDung, type PhieuBenRe } from '@/lib/ideaBenRe';
import { BenReDanhGiaForm } from './BenReDanhGiaForm';
import { useBenReActions, useUngVienBenRe, type UngVienBenRe } from './useBenRe';

// Màn "Đánh giá & trình Bén rễ" của Phòng TCTH.
//
// Trước đây trình Bén rễ là một nút nhỏ trên từng dòng của màn chốt Ươm mầm —
// bấm phát là hồ sơ sang Giám đốc, không kèm căn cứ gì. Giám đốc mở ra chỉ thấy
// tên ý tưởng, muốn biết vì sao TCTH trình thì phải hỏi lại.
//
// Nay TCTH chấm phiếu 5 câu ngay tại đây, phiếu đó CHÍNH LÀ báo cáo trình Giám
// đốc. Phiếu là tham khảo: điểm thấp vẫn trình được nếu TCTH thấy có lý do, hệ
// thống chỉ nêu gợi ý và cảnh báo.

const SO_HIEN_MAC_DINH = 8;

const ngay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

function TheUngVien({ uv, onXong }: { uv: UngVienBenRe; onXong: () => void }) {
  const [mo, setMo] = useState(false);
  const [phieu, setPhieu] = useState<PhieuBenRe>(() =>
    phieuCoNoiDung(uv.danhGiaTcth) ? uv.danhGiaTcth : phieuBenReRong());
  const [dangGui, setDangGui] = useState(false);
  const { trinh } = useBenReActions();

  const kq = chamPhieuBenRe(phieu);
  const daTsc = uv.smpTrangThai === 'dong_y' || uv.smpTrangThai === 'dong_y_mot_phan';

  const gui = async () => {
    setDangGui(true);
    try {
      const ok = await trinh(uv.ideaId, phieu.ghiChu, phieu);
      if (ok) onXong();
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className={`rounded-xl border ${uv.daTungTuChoi ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={() => setMo(o => !o)}
        className="flex w-full cursor-pointer items-start gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-slate-800">{uv.title}</p>
          <p className="mt-0.5 text-2xs text-slate-500">
            {uv.phong} · {uv.proposer} · gửi {ngay(uv.createdAt)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {uv.daTungTuChoi && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-2xs font-bold text-rose-700">
                Giám đốc đã từ chối — cần bổ sung trước khi trình lại
              </span>
            )}
            {daTsc && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-2xs font-bold text-sky-700">
                TSC đã duyệt trên SMP — đủ điều kiện theo quy chế
              </span>
            )}
            {phieuCoNoiDung(uv.danhGiaTcth) && !uv.daTungTuChoi && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">
                Có phiếu chấm dở
              </span>
            )}
          </div>
        </div>
        {mo ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
            : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {mo && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {[
            { nhan: '⚠️ Thực trạng', giaTri: uv.currentStatus },
            { nhan: '💡 Giải pháp đề xuất', giaTri: uv.proposedSolution },
            { nhan: '📈 Lợi ích dự kiến', giaTri: uv.expectedBenefits },
          ].filter(k => k.giaTri?.trim()).map(k => (
            <p key={k.nhan} className="whitespace-pre-line rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
              <b className="text-slate-500">{k.nhan}:</b> {k.giaTri}
            </p>
          ))}

          <BenReDanhGiaForm
            phieu={phieu}
            onChange={setPhieu}
            nhanGhiChu="Ý kiến của Phòng TCTH trình Giám đốc (không bắt buộc)…"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={dangGui}
              onClick={() => void gui()}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#005a9c] px-3.5 py-2 text-xs font-black text-white transition-all hover:bg-[#00457a] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {dangGui ? 'Đang trình…' : 'Trình Giám đốc'}
            </button>
            {!kq.daChamDu && (
              <span className="text-2xs font-semibold text-slate-500">
                Chưa chấm đủ 5 câu — vẫn trình được, nhưng Giám đốc sẽ thiếu căn cứ.
              </span>
            )}
            {kq.daChamDu && kq.ketLuan !== 'nen_trinh' && (
              <span className="text-2xs font-semibold text-amber-700">
                Gợi ý là chưa nên trình — nếu vẫn trình, nên ghi rõ lý do ở ô ý kiến.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const TrinhBenRePanel: React.FC = () => {
  const { ungVien, isLoading } = useUngVienBenRe();
  const [tim, setTim] = useState('');
  const [xemHet, setXemHet] = useState(false);
  const [vuaTrinh, setVuaTrinh] = useState<string[]>([]);

  const loc = useMemo(() => {
    const conLai = ungVien.filter(u => !vuaTrinh.includes(u.ideaId));
    if (!tim.trim()) return conLai;
    return conLai.filter(u => khopTimKiem(
      [u.title, u.proposer, u.phong, u.proposedSolution ?? ''].join(' '), tim));
  }, [ungVien, tim, vuaTrinh]);

  const hien = xemHet ? loc : loc.slice(0, SO_HIEN_MAC_DINH);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 font-black text-slate-800">
          <ClipboardPen className="h-4 w-4 text-[#005a9c]" />
          Đánh giá &amp; trình Giám đốc công nhận Bén rễ
        </p>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-black text-slate-600">
          {loc.length} ý tưởng chờ đánh giá
        </span>
      </div>

      <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-2xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Bảng câu hỏi này là <b>tham khảo</b>, thang <b>thấp hơn</b> Hội đồng chấm Vươn cành và
          Lan tỏa: quy chế đặt điều kiện Bén rễ là <b>«có khả năng thử nghiệm»</b>, chưa đòi bằng
          chứng kết quả. Hệ thống chỉ <b>gợi ý</b> — Phòng TCTH vẫn trình được ý tưởng điểm thấp
          nếu có lý do, và Giám đốc vẫn quyết theo thẩm quyền.
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={tim}
          onChange={e => setTim(e.target.value)}
          placeholder="Tìm ý tưởng để đánh giá (gõ không dấu cũng được)…"
          className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-amber-500"
        />
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Đang tải danh sách…</p>
      ) : hien.length === 0 ? (
        <p className="py-6 text-center text-xs italic text-slate-400">
          {tim.trim() ? 'Không có ý tưởng nào khớp.' : 'Không còn ý tưởng nào chờ đánh giá.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {hien.map(uv => (
            <TheUngVien
              key={uv.ideaId}
              uv={uv}
              onXong={() => setVuaTrinh(v => [...v, uv.ideaId])}
            />
          ))}
          {!xemHet && loc.length > SO_HIEN_MAC_DINH && (
            <button
              type="button"
              onClick={() => setXemHet(true)}
              className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600"
            >
              Xem thêm {loc.length - SO_HIEN_MAC_DINH} ý tưởng
            </button>
          )}
        </div>
      )}
    </div>
  );
};
