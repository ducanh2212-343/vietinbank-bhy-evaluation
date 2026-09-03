import React, { useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock, History, Info, RotateCcw, Undo2, XCircle,
} from 'lucide-react';
import { phieuBenReRong, phieuCoNoiDung, type PhieuBenRe } from '@/lib/ideaBenRe';
import { heQuaThuHoi, rutHoSo as luatRutHoSo, thuHoiQuyetDinh as luatThuHoi, type DongSoBenRe } from '@/lib/ideaThuHoi';
import { BenReDanhGiaForm, BenReDanhGiaTomTat } from './BenReDanhGiaForm';
import {
  useBenReActions, useGdDaQuyetGanDay, useViecCuaGiamDoc, type QuyetDinhGanDay, type ViecGiamDoc,
} from './useBenRe';
import { useLaGiamDoc, useMyDepartmentForIdeas } from './useUomMamPicker';
import { useAuth } from '@/hooks/useAuth';

// Màn "Việc của Giám đốc" — hàng chờ phê duyệt cấp Bén rễ + quyết định gần đây.
//
// Quy chế: cấp Bén rễ do Giám đốc chi nhánh quyết định. TCTH trình liên tục,
// Giám đốc mở màn này là thấy ngay việc phải làm, không phải đi tìm trong
// bảng theo dõi ý tưởng.
//
// THIẾT KẾ LẠI 03/09/2026 theo góp ý của Giám đốc: thẻ hồ sơ trước đây dồn
// phòng · người · ngày vào một dòng chữ nhỏ, không nói ý tưởng là gì nếu không
// bấm mở, và KHÔNG có chỗ nào ghi «có demo hay không» dù cán bộ đã khai lúc
// gửi — Giám đốc phải quay ra bảng tra cứu xem lại từng cái. Nay mỗi thẻ là
// một bảng kê rõ từng dòng, và đoạn «giải pháp đề xuất» hiện sẵn.
//
// THU HỒI: cùng ngày, Giám đốc ấn nhầm «Công nhận» cho một hồ sơ và sổ không
// có đường lùi. Nay có mục «Quyết định gần đây» để tìm lại và thu hồi — hồ sơ
// về hàng chờ, CSDL tự gỡ KPI, tiền, lũy kế, trả cấp độ. Phải ghi lý do: đây
// là việc phải giải trình được, không phải nút hoàn tác. TCTH cũng rút được
// hồ sơ mình trình nhầm khi còn ở hàng chờ.
//
// TCTH xem được hàng chờ (chỉ xem) để biết hồ sơ mình trình đang nằm ở đâu.

const NGAY_CANH_BAO_CHO_LAU = 7;
const DO_DAI_TRICH = 260;

const ngay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const ngayGio = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const trich = (s: string | null | undefined) => {
  const t = (s ?? '').trim();
  return t.length > DO_DAI_TRICH ? `${t.slice(0, DO_DAI_TRICH).trimEnd()}…` : t;
};

/** Chip demo — nói cả hai chiều, vì «không thấy chip» không phân biệt được với «chưa khai» */
function ChipDemo({ co }: { co: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
      co ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}>
      {co ? '🧪 Có demo' : 'Chưa có demo'}
    </span>
  );
}

function ChipCapDeXuat({ cap }: { cap: string | null }) {
  if (!cap) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
      cap === 'Đề xuất TSC' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
    }`}>
      {cap}
    </span>
  );
}

/** Bảng kê thông tin hồ sơ — mỗi dòng một nhãn, Giám đốc đọc từ trên xuống là đủ */
function BangKe({ dong }: { dong: { nhan: string; giaTri: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {dong.map(d => (
        <React.Fragment key={d.nhan}>
          <dt className="font-bold text-slate-500">{d.nhan}</dt>
          <dd className="min-w-0 text-slate-800">{d.giaTri}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/**
 * Khung «bấm rồi ghi lý do rồi mới xác nhận» dùng chung cho thu hồi và rút hồ sơ.
 * Không dùng hộp thoại confirm() của trình duyệt: cần chỗ ghi lý do và cần liệt
 * kê hệ quả ngay trước mắt người bấm.
 */
function KhungLyDo({ nhan, heQua, icon: Icon, onXacNhan, mau = 'amber' }: {
  nhan: string;
  heQua: string[];
  icon: typeof RotateCcw;
  onXacNhan: (lyDo: string) => Promise<boolean>;
  mau?: 'amber' | 'slate';
}) {
  const [mo, setMo] = useState(false);
  const [lyDo, setLyDo] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const xacNhan = async () => {
    setDangGui(true);
    try {
      const ok = await onXacNhan(lyDo);
      if (ok) { setMo(false); setLyDo(''); }
    } finally {
      setDangGui(false);
    }
  };

  if (!mo) {
    return (
      <button
        type="button"
        onClick={() => setMo(true)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-2xs font-bold transition-all ${
          mau === 'amber'
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Icon className="h-3.5 w-3.5" /> {nhan}
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3">
      <p className="text-2xs font-black uppercase tracking-wider text-amber-800">{nhan} — hệ thống sẽ:</p>
      <ul className="list-disc space-y-0.5 pl-4 text-2xs text-amber-900">
        {heQua.map(h => <li key={h}>{h}</li>)}
      </ul>
      <input
        type="text"
        autoFocus
        value={lyDo}
        onChange={e => setLyDo(e.target.value)}
        placeholder="Lý do (bắt buộc, sẽ lưu vào sổ)…"
        className="w-full rounded-lg border border-amber-300 bg-white p-2 text-2xs outline-none focus:border-amber-500"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={dangGui || !lyDo.trim()}
          onClick={() => void xacNhan()}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-2xs font-black text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon className="h-3.5 w-3.5" /> {dangGui ? 'Đang xử lý…' : `Xác nhận ${nhan.toLowerCase()}`}
        </button>
        <button
          type="button"
          onClick={() => { setMo(false); setLyDo(''); }}
          className="cursor-pointer rounded-lg px-3 py-2 text-2xs font-bold text-slate-500 hover:bg-slate-100"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

function TheViec({ v, laGiamDoc, laQuanTri, onQuyet, onRut }: {
  v: ViecGiamDoc;
  laGiamDoc: boolean;
  laQuanTri: boolean;
  onQuyet: (ideaId: string, dongY: boolean, phieu: PhieuBenRe) => Promise<void>;
  onRut: (ideaId: string, lyDo: string) => Promise<boolean>;
}) {
  const [phieu, setPhieu] = useState<PhieuBenRe>(phieuBenReRong());
  const [moDayDu, setMoDayDu] = useState(false);
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

  const dongSo: DongSoBenRe = {
    trangThai: 'cho_gd_duyet', duyetCn: false, duyetTsc: false, coQuyetDinhGd: false,
  };
  const luatRut = luatRutHoSo(dongSo, { laGiamDoc, laQuanTri });

  const khoiNoiDung = [
    { nhan: 'Thực trạng', giaTri: v.currentStatus },
    { nhan: 'Giải pháp đề xuất', giaTri: v.proposedSolution },
    { nhan: 'Lợi ích dự kiến', giaTri: v.expectedBenefits },
  ].filter(k => k.giaTri?.trim());

  return (
    <div className={`space-y-3 rounded-xl border p-3 sm:p-4 ${choLau ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white'}`}>
      {/* Dòng chip + đồng hồ chờ */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ChipCapDeXuat cap={v.capDeXuat} />
        <ChipDemo co={v.coDemo} />
        {v.soLanThuHoi > 0 && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-2xs font-bold text-rose-700">
            Đã thu hồi {v.soLanThuHoi} lần
          </span>
        )}
        <span
          className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-black ${
            choLau ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
          }`}
          title={`TCTH trình ngày ${ngay(v.trinhLuc)}${v.nguoiTrinh ? ` — ${v.nguoiTrinh}` : ''}`}
        >
          <Clock className="h-3 w-3" />
          {v.soNgayCho === 0 ? 'Trình hôm nay' : `Chờ ${v.soNgayCho} ngày`}
        </span>
      </div>

      {/* Tên ý tưởng — thứ đầu tiên mắt phải rơi vào */}
      <p className="text-sm font-black leading-snug text-slate-900">{v.title}</p>

      <BangKe dong={[
        { nhan: 'Phòng', giaTri: <b>{v.phong}</b> },
        { nhan: 'Người đề xuất', giaTri: <b>{v.proposer}</b> },
        { nhan: 'Sản phẩm demo', giaTri: v.coDemo ? <b className="text-emerald-700">Có — cán bộ khai có demo khi gửi</b> : 'Chưa có' },
        { nhan: 'Cấp hiện tại', giaTri: v.developmentLevel ?? '—' },
        { nhan: 'Gửi ngày', giaTri: ngay(v.createdAt) },
        { nhan: 'TCTH trình', giaTri: `${ngay(v.trinhLuc)}${v.nguoiTrinh ? ` — ${v.nguoiTrinh}` : ''}` },
      ]} />

      {/* Ý tưởng là gì — hiện sẵn đoạn giải pháp, không bắt bấm mới thấy */}
      {v.proposedSolution?.trim() && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="mb-1 text-2xs font-black uppercase tracking-wider text-slate-500">Ý tưởng đề xuất gì</p>
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
            {moDayDu ? v.proposedSolution : trich(v.proposedSolution)}
          </p>
        </div>
      )}

      {khoiNoiDung.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setMoDayDu(o => !o)}
            className="flex cursor-pointer items-center gap-1 text-2xs font-bold text-slate-500 hover:text-slate-700"
          >
            {moDayDu ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {moDayDu ? 'Thu gọn' : 'Xem đầy đủ thực trạng · giải pháp · lợi ích'}
          </button>
          {moDayDu && (
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

      {v.soLanThuHoi > 0 && (
        <p className="flex gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-2xs text-rose-800">
          <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Hồ sơ này đã có quyết định rồi được thu hồi
            {v.thuHoiLuc ? ` ngày ${ngay(v.thuHoiLuc)}` : ''}
            {v.lyDoThuHoi ? ` — lý do: «${v.lyDoThuHoi}»` : ''}. Quyết lại từ đầu; phiếu cũ của Giám đốc đã xóa.
          </span>
        </p>
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
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {laGiamDoc && (
          <>
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
          </>
        )}
        {luatRut.duoc && (
          <div className={laGiamDoc ? 'ml-auto' : ''}>
            <KhungLyDo
              nhan={luatRut.nhan}
              heQua={heQuaThuHoi(dongSo)}
              icon={Undo2}
              mau="slate"
              onXacNhan={lyDo => onRut(v.ideaId, lyDo)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Một quyết định đã ra — để Giám đốc tìm lại và thu hồi khi bấm nhầm */
function TheDaQuyet({ q, laGiamDoc, laQuanTri, onThuHoi }: {
  q: QuyetDinhGanDay;
  laGiamDoc: boolean;
  laQuanTri: boolean;
  onThuHoi: (ideaId: string, lyDo: string) => Promise<boolean>;
}) {
  const daCongNhan = q.trangThai === 'da_ghi_nhan';
  const dongSo: DongSoBenRe = {
    trangThai: q.trangThai,
    duyetCn: q.duyetCn,
    duyetTsc: q.duyetTsc,
    coQuyetDinhGd: true,
    daLenCapCaoHon: q.developmentLevel === 'Vươn cành' || q.developmentLevel === 'Lan tỏa',
  };
  const luat = luatThuHoi(dongSo, { laGiamDoc, laQuanTri });

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-2xs font-black ${
          daCongNhan ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
        }`}>
          {daCongNhan ? '✓ Đã công nhận Bén rễ' : '✕ Chưa đạt'}
        </span>
        <ChipCapDeXuat cap={q.capDeXuat} />
        <ChipDemo co={q.coDemo} />
        {q.duyetTsc && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-2xs font-bold text-sky-700">TSC cũng công nhận</span>
        )}
        <span className="ml-auto text-2xs text-slate-500">
          {ngayGio(q.duyetLuc)}{q.nguoiDuyet ? ` · ${q.nguoiDuyet}` : ''}
        </span>
      </div>
      <p className="text-sm font-bold leading-snug text-slate-800">{q.title}</p>
      <BangKe dong={[
        { nhan: 'Phòng', giaTri: q.phong },
        { nhan: 'Người đề xuất', giaTri: q.proposer },
        {
          nhan: 'Điểm phiếu',
          giaTri: `TCTH ${q.diemTcth ?? '—'}/10 · Giám đốc ${q.diemGd ?? 'chưa chấm'}${q.diemGd != null ? '/10' : ''}`,
        },
        ...(q.yKienGd ? [{ nhan: 'Ý kiến GĐ', giaTri: <i>«{q.yKienGd}»</i> }] : []),
        ...(daCongNhan ? [{ nhan: 'Đã cam kết', giaTri: `${q.mucThuong.toLocaleString('vi-VN')}đ · tính KPI` }] : []),
      ]} />
      {laGiamDoc && (
        luat.duoc ? (
          <KhungLyDo
            nhan={luat.nhan}
            heQua={heQuaThuHoi(dongSo)}
            icon={RotateCcw}
            onXacNhan={lyDo => onThuHoi(q.ideaId, lyDo)}
          />
        ) : (
          <p className="text-2xs italic text-slate-500">{luat.nhan}</p>
        )
      )}
    </div>
  );
}

export const GiamDocDuyetBenRe: React.FC = () => {
  // Quyền XEM suy thẳng từ vai trò của phiên đăng nhập, không chờ mạng: bản
  // trước ẩn cả khối trong lúc còn hỏi máy chủ «có phải Giám đốc không», nên
  // một lượt hỏi treo là hàng chờ biến mất mà không ai biết vì sao.
  // Lượt hỏi vẫn giữ để bắt thêm Giám đốc nhận theo chức danh trong hồ sơ.
  const { roles } = useAuth();
  const { laGiamDoc: giamDocTheoHoSo } = useLaGiamDoc();
  const laGiamDoc = roles.includes('bgd') || roles.includes('system_admin') || giamDocTheoHoSo;
  const { isAdmin: laQuanTri } = useMyDepartmentForIdeas();
  const duocXem = laGiamDoc || laQuanTri;
  const { viec, isLoading } = useViecCuaGiamDoc(duocXem);
  const { daQuyet, isLoading: dangTaiDaQuyet } = useGdDaQuyetGanDay(duocXem);
  const { duyet, thuHoiQuyetDinh, rutHoSo } = useBenReActions();
  const [moDaQuyet, setMoDaQuyet] = useState(false);

  if (!duocXem) return null;

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
          nhận thì thưởng <b>300.000đ</b> và cộng bù các cấp dưới chưa từng được thưởng.
          Bấm nhầm thì <b>thu hồi được</b> ở mục «Quyết định gần đây» bên dưới — hồ sơ về hàng chờ,
          tiền và ghi nhận tự gỡ.
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
            <TheViec
              key={v.ideaId}
              v={v}
              laGiamDoc={laGiamDoc}
              laQuanTri={laQuanTri}
              onQuyet={quyet}
              onRut={rutHoSo}
            />
          ))}
        </div>
      )}

      {/* Quyết định gần đây — nơi tìm lại hồ sơ bấm nhầm */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60">
        <button
          type="button"
          onClick={() => setMoDaQuyet(o => !o)}
          className="flex w-full cursor-pointer items-center gap-2 p-3 text-left"
        >
          <History className="h-4 w-4 text-slate-500" />
          <span className="font-black text-slate-700">Quyết định gần đây (30 ngày)</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-2xs font-black text-slate-700">
            {dangTaiDaQuyet ? '…' : daQuyet.length}
          </span>
          <span className="ml-auto text-2xs text-slate-500">
            {laGiamDoc ? 'Bấm nhầm thì thu hồi ở đây' : 'Chỉ Giám đốc thu hồi được'}
          </span>
          {moDaQuyet ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {moDaQuyet && (
          <div className="space-y-2 border-t border-slate-200 p-3">
            {daQuyet.length === 0 ? (
              <p className="py-2 text-center italic text-slate-400">Chưa có quyết định nào trong 30 ngày qua.</p>
            ) : (
              daQuyet.map(q => (
                <TheDaQuyet
                  key={q.ideaId}
                  q={q}
                  laGiamDoc={laGiamDoc}
                  laQuanTri={laQuanTri}
                  onThuHoi={thuHoiQuyetDinh}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
