import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock, Info, XCircle } from 'lucide-react';
import { phieuBenReRong, phieuCoNoiDung, type PhieuBenRe } from '@/lib/ideaBenRe';
import { BenReDanhGiaForm, BenReDanhGiaTomTat } from './BenReDanhGiaForm';
import { useBenReActions, useViecCuaGiamDoc, type ViecGiamDoc } from './useBenRe';
import { useLaGiamDoc, useMyDepartmentForIdeas } from './useUomMamPicker';

// Màn "Việc của Giám đốc" — hàng chờ phê duyệt cấp Bén rễ.
//
// Quy chế: cấp Bén rễ do Giám đốc chi nhánh quyết định. TCTH trình liên tục,
// Giám đốc mở màn này là thấy ngay việc phải làm, không phải đi tìm trong
// bảng theo dõi ý tưởng.
//
// Mỗi hồ sơ nay kèm PHIẾU ĐÁNH GIÁ của TCTH — đó chính là báo cáo trình. Giám
// đốc đọc báo cáo, mở nội dung ý tưởng nếu cần, và có thể chấm phiếu của mình
// theo CÙNG bộ câu hỏi để hai bên đối chiếu được. Phiếu là tham khảo, quyết
// định vẫn hoàn toàn thuộc Giám đốc.
//
// TCTH cũng xem được (chỉ xem) để biết hồ sơ mình trình đang nằm ở đâu và
// đôn đốc khi việc để lâu.

const NGAY_CANH_BAO_CHO_LAU = 7;

const ngay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

function TheViec({ v, laGiamDoc, onQuyet }: {
  v: ViecGiamDoc;
  laGiamDoc: boolean;
  onQuyet: (ideaId: string, dongY: boolean, phieu: PhieuBenRe) => Promise<void>;
}) {
  const [phieu, setPhieu] = useState<PhieuBenRe>(phieuBenReRong());
  const [moNoiDung, setMoNoiDung] = useState(false);
  const [moPhieu, setMoPhieu] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const choLau = v.soNgayCho >= NGAY_CANH_BAO_CHO_LAU;
  const coBaoCao = phieuCoNoiDung(v.danhGiaTcth);

  const quyet = async (dongY: boolean) => {
    setDangGui(true);
    try {
      await onQuyet(v.ideaId, dongY, phieu);
    } finally {
      setDangGui(false);
    }
  };

  const khoiNoiDung = [
    { nhan: '⚠️ Thực trạng', giaTri: v.currentStatus },
    { nhan: '💡 Giải pháp đề xuất', giaTri: v.proposedSolution },
    { nhan: '📈 Lợi ích dự kiến', giaTri: v.expectedBenefits },
  ].filter(k => k.giaTri?.trim());

  return (
    <div className={`space-y-2 rounded-xl border p-3 ${choLau ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-[200px] flex-1">
          <p className="font-bold leading-snug text-slate-800">{v.title}</p>
          <p className="text-2xs text-slate-500">
            {v.phong} · {v.proposer} · gửi {ngay(v.createdAt)}
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-black ${
            choLau ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
          }`}
          title={`TCTH trình ngày ${ngay(v.trinhLuc)}${v.nguoiTrinh ? ` — ${v.nguoiTrinh}` : ''}`}
        >
          <Clock className="h-3 w-3" />
          {v.soNgayCho === 0 ? 'Trình hôm nay' : `Chờ ${v.soNgayCho} ngày`}
        </span>
      </div>

      {/* Báo cáo của TCTH — thứ Giám đốc cần đọc trước khi quyết */}
      {coBaoCao ? (
        <BenReDanhGiaTomTat
          phieu={v.danhGiaTcth}
          tieuDe={`Báo cáo Phòng TCTH${v.nguoiTrinh ? ` — ${v.nguoiTrinh}` : ''}`}
        />
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-2xs italic text-slate-500">
          Hồ sơ này được trình trước khi có bảng đánh giá — không có phiếu chấm của TCTH.
        </p>
      )}

      {v.ghiChu?.trim() && !coBaoCao && (
        <p className="rounded-lg border border-sky-100 bg-sky-50 p-2 text-2xs text-sky-800">
          <b>Ý kiến TCTH:</b> {v.ghiChu}
        </p>
      )}

      {khoiNoiDung.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setMoNoiDung(o => !o)}
            className="flex cursor-pointer items-center gap-1 text-2xs font-bold text-slate-500 hover:text-slate-700"
          >
            {moNoiDung ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {moNoiDung ? 'Thu gọn nội dung ý tưởng' : 'Xem nội dung ý tưởng'}
          </button>
          {moNoiDung && (
            <div className="space-y-1.5">
              {khoiNoiDung.map(k => (
                <p key={k.nhan} className="whitespace-pre-line rounded-lg bg-slate-50 p-2 text-2xs leading-relaxed text-slate-700">
                  <b className="text-slate-500">{k.nhan}:</b> {k.giaTri}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {laGiamDoc && (
        <>
          <button
            type="button"
            onClick={() => setMoPhieu(o => !o)}
            className="flex cursor-pointer items-center gap-1 text-2xs font-bold text-[#005a9c] hover:underline"
          >
            {moPhieu ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {moPhieu ? 'Thu gọn phiếu của tôi' : 'Chấm phiếu của tôi (không bắt buộc)'}
          </button>
          {moPhieu && (
            <BenReDanhGiaForm
              phieu={phieu}
              onChange={setPhieu}
              nhanGhiChu="Ý kiến chỉ đạo của Giám đốc (không bắt buộc)…"
            />
          )}

          {!moPhieu && (
            <input
              type="text"
              value={phieu.ghiChu ?? ''}
              onChange={e => setPhieu({ ...phieu, ghiChu: e.target.value })}
              placeholder="Ý kiến chỉ đạo (không bắt buộc)…"
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-2xs outline-none focus:border-amber-500"
            />
          )}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              disabled={dangGui}
              onClick={() => void quyet(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-2xs font-black text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Công nhận Bén rễ
            </button>
            <button
              type="button"
              disabled={dangGui}
              onClick={() => void quyet(false)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-2xs font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" /> Chưa đạt
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export const GiamDocDuyetBenRe: React.FC = () => {
  const { laGiamDoc, isLoading: dangDoQuyen } = useLaGiamDoc();
  const { isAdmin } = useMyDepartmentForIdeas();
  const duocXem = laGiamDoc || isAdmin;
  const { viec, isLoading } = useViecCuaGiamDoc(duocXem);
  const { duyet } = useBenReActions();

  if (dangDoQuyen || !duocXem) return null;

  const quyet = async (ideaId: string, dongY: boolean, phieu: PhieuBenRe) => {
    await duyet(ideaId, dongY, phieu.ghiChu, phieuCoNoiDung(phieu) ? phieu : undefined);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 font-black text-slate-800">
          <ClipboardCheck className="h-4 w-4 text-[#005a9c]" />
          {laGiamDoc ? 'Việc của Giám đốc — công nhận cấp Bén rễ' : 'Hồ sơ Bén rễ đang chờ Giám đốc'}
        </p>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-2xs font-black ${
          viec.length > 0 ? 'bg-[#005a9c]/10 text-[#005a9c]' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {viec.length > 0 ? `${viec.length} việc chờ duyệt` : 'Không còn việc chờ'}
        </span>
      </div>

      <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-2xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Theo quy chế, cấp <b>Bén rễ</b> do <b>Giám đốc chi nhánh</b> quyết định. Phòng TCTH
          trình <b>liên tục</b> kèm phiếu đánh giá 5 câu — đó là báo cáo trình. Ý tưởng được công
          nhận thì thưởng <b>300.000đ</b> và cộng bù các cấp dưới chưa từng được thưởng. Chỉ khi
          Giám đốc duyệt, ý tưởng mới được tính vào <b>KPI Đổi mới sáng tạo</b>.
        </span>
      </div>

      {isLoading ? (
        <p className="py-4 text-center italic text-slate-400">Đang tải danh sách…</p>
      ) : viec.length === 0 ? (
        <p className="py-4 text-center italic text-slate-400">
          Không có hồ sơ nào đang chờ — Phòng TCTH sẽ trình khi có ý tưởng đủ điều kiện.
        </p>
      ) : (
        <div className="space-y-2">
          {viec.map(v => (
            <TheViec key={v.ideaId} v={v} laGiamDoc={laGiamDoc} onQuyet={quyet} />
          ))}
        </div>
      )}
    </div>
  );
};
