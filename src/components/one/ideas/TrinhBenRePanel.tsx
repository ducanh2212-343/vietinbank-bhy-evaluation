import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, ClipboardPen, Globe, Info, Search, Send } from 'lucide-react';
import { khopTimKiem } from '@/lib/vietnamese';
import type { IdeaLevel } from '@/data/one/ideasConfig';
import { canChamPhieuBenRe, chamPhieuBenRe, duongLenBenRe, phieuBenReRong, phieuCoNoiDung, type PhieuBenRe } from '@/lib/ideaBenRe';
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

// Bộ lọc theo CẤP ĐỀ XUẤT — chính là hai đường lên Bén rễ của quy chế mục 4.
//
// Vận hành 27/08/2026, Phòng TCTH nêu: ý tưởng «Đề xuất TSC» thì TCTH chỉ khớp
// trạng thái với phê duyệt của Trụ sở chính, KHÔNG chấm phiếu ở màn này. Đổ
// chung một danh sách thì phải lướt 109 phiếu đường 2 để tìm 44 phiếu đường 1.
//
// Mặc định mở đúng phần việc của màn này (Đề xuất nội bộ). Không giấu phần còn
// lại: mỗi mục đều hiện số lượng nên nhìn là biết còn gì chưa đụng tới.
type MaLoc = 'noi_bo' | 'tsc' | 'tat_ca';

const CAC_LOC: { ma: MaLoc; nhan: string; capDeXuat: IdeaLevel | null }[] = [
  { ma: 'noi_bo', nhan: 'Đề xuất nội bộ', capDeXuat: 'Nội bộ CN' },
  { ma: 'tsc', nhan: 'Đề xuất TSC', capDeXuat: 'Đề xuất TSC' },
  { ma: 'tat_ca', nhan: 'Tất cả', capDeXuat: null },
];

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
                TSC đã duyệt trên SMP — ghi nhận ở màn Đối chiếu SMP, khỏi qua Giám đốc
              </span>
            )}
            {uv.capDeXuat && (
              <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                uv.capDeXuat === 'Đề xuất TSC'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {uv.capDeXuat}
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

          {/* Ý tưởng đi đường 2 thì mở ra vẫn xem được nội dung, nhưng không
              bày phiếu chấm — chấm ở đây là làm thừa một việc quy chế không
              đòi, và dễ tưởng đã trình rồi trong khi chưa. */}
          {canChamPhieuBenRe(uv.capDeXuat) ? (
            <BenReDanhGiaForm
              phieu={phieu}
              onChange={setPhieu}
              nhanGhiChu="Ý kiến của Phòng TCTH trình Giám đốc (không bắt buộc)…"
            />
          ) : (
            <p className="rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-2xs leading-relaxed text-sky-900">
              <b>Đường 2 — {duongLenBenRe(uv.capDeXuat).ten}.</b>{' '}
              {duongLenBenRe(uv.capDeXuat).viec}{' '}
              Vẫn trình Giám đốc được nếu Chi nhánh muốn tự thử nghiệm ý tưởng này
              trước khi Trụ sở chính trả lời.
            </p>
          )}

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
  const [maLoc, setMaLoc] = useState<MaLoc>('noi_bo');
  const [xemHet, setXemHet] = useState(false);
  const [vuaTrinh, setVuaTrinh] = useState<string[]>([]);

  const conLai = useMemo(
    () => ungVien.filter(u => !vuaTrinh.includes(u.ideaId)),
    [ungVien, vuaTrinh]);

  const demTheoLoc = useMemo(() => ({
    noi_bo: conLai.filter(u => u.capDeXuat === 'Nội bộ CN').length,
    tsc: conLai.filter(u => u.capDeXuat === 'Đề xuất TSC').length,
    tat_ca: conLai.length,
  }), [conLai]);

  const loc = useMemo(() => {
    const cap = CAC_LOC.find(l => l.ma === maLoc)?.capDeXuat ?? null;
    const theoCap = cap ? conLai.filter(u => u.capDeXuat === cap) : conLai;
    if (!tim.trim()) return theoCap;
    return theoCap.filter(u => khopTimKiem(
      [u.title, u.proposer, u.phong, u.proposedSolution ?? ''].join(' '), tim));
  }, [conLai, tim, maLoc]);

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

      {/* Chọn đường trước, rồi mới tới việc — mỗi mục kèm số để không giấu gì */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {CAC_LOC.map(l => (
          <button
            key={l.ma}
            type="button"
            onClick={() => { setMaLoc(l.ma); setXemHet(false); }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-2xs font-bold transition-colors ${
              maLoc === l.ma ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {l.nhan}
            <span className={`rounded-full px-1.5 py-0.5 font-black leading-none ${
              maLoc === l.ma ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {demTheoLoc[l.ma]}
            </span>
          </button>
        ))}
      </div>

      {/* Đang xem đường 2 thì việc KHÔNG nằm ở màn này — nói thẳng và dẫn đi
          luôn, thay vì để TCTH chấm phiếu cho những ý tưởng không cần chấm.
          Trạng thái SMP vẫn chỉ sửa ở MỘT nơi là màn Đối chiếu SMP. */}
      {maLoc === 'tsc' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-2xs text-sky-900">
          <Globe className="h-4 w-4 shrink-0" />
          <span className="min-w-[240px] flex-1">
            Ý tưởng <b>Đề xuất TSC</b> lên Bén rễ bằng <b>đường 2</b>: chỉ cần khớp trạng thái
            với phê duyệt của Trụ sở chính («Đồng ý» hoặc «Đồng ý một phần»), hệ thống tự ghi
            nhận — <b>không phải chấm phiếu và không phải trình Giám đốc</b>.
          </span>
          <Link
            to="/one/y-tuong/van-hanh?viec=doi_chieu_smp"
            className="flex items-center gap-1.5 rounded-lg bg-[#005a9c] px-3 py-1.5 font-black text-white transition-colors hover:bg-[#00457a]"
          >
            Sang màn Đối chiếu SMP <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-2xs text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Bảng câu hỏi này là <b>tham khảo</b>, thang <b>thấp hơn</b> Hội đồng chấm Vươn cành và
            Lan tỏa: quy chế đặt điều kiện Bén rễ là <b>«có khả năng thử nghiệm»</b>, chưa đòi bằng
            chứng kết quả. Hệ thống chỉ <b>gợi ý</b> — Phòng TCTH vẫn trình được ý tưởng điểm thấp
            nếu có lý do, và Giám đốc vẫn quyết theo thẩm quyền.
          </span>
        </div>
      )}

      {/* Quy chế mục 4 mở HAI đường lên Bén rễ. Nêu rõ ở đây vì đi nhầm đường
          thì hoặc làm phiền Giám đốc việc không cần duyệt, hoặc bỏ sót ý tưởng
          Trụ sở chính đã đồng ý. */}
      <div className={`gap-2 sm:grid-cols-2 ${maLoc === 'tsc' ? 'hidden' : 'grid'}`}>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-2xs text-slate-700">
          <b className="block text-slate-800">Đường 1 — Chi nhánh thử nghiệm</b>
          Ý tưởng có khả năng làm thử tại Chi nhánh: đánh giá ở màn này rồi
          <b> trình Giám đốc</b> quyết.
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 text-2xs text-sky-900">
          <b className="block text-sky-950">Đường 2 — Trụ sở chính đồng ý</b>
          Ý tưởng TSC đã duyệt trên SMP: ghi kết quả ở màn <b>Đối chiếu SMP</b>,
          hệ thống tự ghi nhận Bén rễ — <b>không cần qua Giám đốc</b>.
        </div>
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
