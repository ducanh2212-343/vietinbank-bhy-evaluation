import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, ChevronDown, ChevronUp, CornerDownLeft, ExternalLink, FileSpreadsheet,
  RotateCcw, Search, Sprout, StopCircle, Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { khopTimKiem } from '@/lib/vietnamese';
import {
  NHOM_SO_BEN_RE, demTheoNhom, hanhDongSoBenRe, phanLoaiSoBenRe, type HanhDongSo, type NhomSoBenRe,
} from '@/lib/ideaSoBenRe';
import { heQuaThuHoi, type DongSoBenRe as DongLuatThuHoi } from '@/lib/ideaThuHoi';
import { phieuCoNoiDung } from '@/lib/ideaBenRe';
import { quyenTuVaiTro } from '@/lib/ideaVanHanh';
import { useAuth } from '@/hooks/useAuth';
import { BenReDanhGiaTomTat } from './BenReDanhGiaForm';
import { KhungLyDo } from './KhungLyDo';
import { downloadSoGhiNhanExcel } from './soGhiNhanExcel';
import { useBenReActions, useSoBenRe, useSoGhiNhanDayDu, type DongSoBenReDayDu } from './useBenRe';
import { useCauHinhIdeas, useLaGiamDoc } from './useUomMamPicker';

// Sổ Bén rễ — Giám đốc và Phòng TCTH cùng nhìn một sổ, và THAO TÁC NGAY TRÊN SỔ.
//
// Yêu cầu 03/09/2026: phân biệt Bén rễ do Giám đốc duyệt (đường Chi nhánh) với
// do Trụ sở chính đồng ý (đường TSC); thấy hồ sơ nào TCTH trả về, Giám đốc trả
// về. Cùng ngày Giám đốc thêm: «ấn vào sáng kiến luôn hoặc có nút thu hồi» —
// sổ chỉ để đọc thì muốn làm gì lại phải sang tab khác tìm lại đúng dòng đó.
// Nay mỗi dòng mở ra là đủ nội dung ý tưởng, phiếu TCTH, ý kiến Giám đốc và
// dải nút theo vai. Riêng hai quyết định dứt điểm (Công nhận / Chưa đạt) vẫn ở
// hàng chờ, nơi có đồng hồ 3 giây — ở đây chỉ dẫn sang.

const SO_HIEN = 12;
const ngay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—');

function DongMoTa({ d }: { d: DongSoBenReDayDu }) {
  const nhom = phanLoaiSoBenRe(d);
  switch (nhom) {
    case 'cong_nhan_gd':
      return <>Giám đốc duyệt ngày {ngay(d.duyetLuc)}{d.nguoiDuyet ? ` — ${d.nguoiDuyet}` : ''} · TCTH trình {ngay(d.trinhLuc)}</>;
    case 'cong_nhan_tsc':
      return <>Trụ sở chính đồng ý trên SMP{d.smpMa ? ` · mã ${d.smpMa}` : ''} · trạng thái SMP: {d.smpTrangThai ?? '—'}</>;
    case 'cong_nhan_ca_hai':
      return <>Giám đốc duyệt {ngay(d.duyetLuc)} và Trụ sở chính đồng ý{d.smpMa ? ` (mã ${d.smpMa})` : ''}</>;
    case 'cho_gd':
      return <>TCTH trình ngày {ngay(d.trinhLuc)}{d.nguoiTrinh ? ` — ${d.nguoiTrinh}` : ''} · đang chờ Giám đốc</>;
    case 'tcth_tra_ve':
    case 'gd_tra_ve':
      return <>Trả về ngày {ngay(d.traVeLuc)}: «{d.lyDoTraVe ?? '—'}» · đang chờ cán bộ bổ sung</>;
    case 'da_bo_sung':
      return <>Cán bộ bổ sung ngày {ngay(d.boSungLuc)} (lần {d.soLanBoSung}) · chờ TCTH chấm lại</>;
    case 'nuoi_duong':
      return <>TCTH đưa vào nuôi dưỡng ngày {ngay(d.ketLuanLuc)}: «{d.lyDoKetLuan ?? '—'}»{d.phoiHopTen.length ? ` · ghép cùng ${d.phoiHopTen.map(t => `«${t}»`).join(', ')}` : ''}</>;
    case 'dung':
      return <>TCTH dừng ươm mầm ngày {ngay(d.ketLuanLuc)}: «{d.lyDoKetLuan ?? '—'}»</>;
    case 'chua_dat':
      return <>Giám đốc kết luận chưa đạt ngày {ngay(d.duyetLuc)}{d.yKienGd ? ` — «${d.yKienGd}»` : ''}</>;
    case 'da_rut':
      return <>Đã rút khỏi hàng chờ / gỡ theo đường TSC{d.lyDoThuHoi ? ` — «${d.lyDoThuHoi}»` : ''}</>;
  }
}

/** Dải nút theo vai — luật ở ideaSoBenRe.hanhDongSoBenRe, trùng hàm gác CSDL */
function DaiHanhDong({ d, laGiamDoc, laQuanTri }: { d: DongSoBenReDayDu; laGiamDoc: boolean; laQuanTri: boolean }) {
  const { thuHoiQuyetDinh, rutHoSo, traVeBoSung, ketLuanTcth } = useBenReActions();
  const cacHanhDong = hanhDongSoBenRe(
    { ...d, daLenCapCaoHon: d.developmentLevel === 'Vươn cành' || d.developmentLevel === 'Lan tỏa' },
    { laGiamDoc, laQuanTri },
  );
  const dongLuat: DongLuatThuHoi = {
    trangThai: d.trangThai === 'nuoi_duong' || d.trangThai === 'dung' || d.trangThai === 'tra_ve' || d.trangThai === 'da_bo_sung'
      ? 'thu_hoi' : d.trangThai,
    duyetCn: d.duyetCn, duyetTsc: d.duyetTsc, coQuyetDinhGd: !!d.nguoiDuyet,
  };
  // Trả về từ hàng chờ là việc của Giám đốc; các trạng thái khác là của TCTH
  const vaiTraVe: 'gd' | 'tcth' = d.trangThai === 'cho_gd_duyet' && laGiamDoc ? 'gd' : 'tcth';

  const nut: Record<HanhDongSo, React.ReactNode> = {
    thu_hoi_cong_nhan: (
      <KhungLyDo nhan="Thu hồi công nhận" icon={RotateCcw} heQua={heQuaThuHoi(dongLuat)}
        onXacNhan={lyDo => thuHoiQuyetDinh(d.ideaId, lyDo)} />
    ),
    mo_lai: (
      <KhungLyDo nhan="Mở lại hồ sơ" icon={RotateCcw} heQua={heQuaThuHoi(dongLuat)}
        onXacNhan={lyDo => thuHoiQuyetDinh(d.ideaId, lyDo)} />
    ),
    rut_ho_so: (
      <KhungLyDo nhan="Rút hồ sơ" icon={Undo2} mau="slate" heQua={heQuaThuHoi({ ...dongLuat, trangThai: 'cho_gd_duyet' })}
        onXacNhan={lyDo => rutHoSo(d.ideaId, lyDo)} />
    ),
    tra_ve: (
      <KhungLyDo nhan="Trả về bổ sung" icon={CornerDownLeft} mau="orange"
        placeholder="Khuyến nghị cụ thể cho cán bộ (bắt buộc, cán bộ đọc nguyên văn)…"
        heQua={['Hồ sơ về tay cán bộ đề xuất để sửa', 'Cán bộ nhận thông báo kèm nguyên văn khuyến nghị', 'Gửi lại xong, Phòng TCTH chấm lại rồi trình']}
        onXacNhan={lyDo => traVeBoSung(d.ideaId, lyDo, vaiTraVe)} />
    ),
    nuoi_duong: (
      <KhungLyDo nhan="Nuôi dưỡng" icon={Sprout} mau="teal"
        placeholder="Hướng phát triển / vì sao đáng nuôi (bắt buộc)…"
        heQua={['Đánh dấu đang nuôi dưỡng, chưa trình Giám đốc', 'Chủ ý tưởng nhận thông báo, được mời góp ý', 'Muốn ghép với ý tưởng khác thì làm ở màn Đánh giá & trình']}
        onXacNhan={lyDo => ketLuanTcth(d.ideaId, 'nuoi_duong', lyDo)} />
    ),
    dung: (
      <KhungLyDo nhan="Dừng ươm mầm" icon={StopCircle} mau="slate"
        placeholder="Vì sao chưa khả thi (bắt buộc)…"
        heQua={['Ý tưởng dừng ở cấp Ươm mầm, không trình Bén rễ', 'Chủ ý tưởng nhận thông báo kèm lý do', 'Vẫn mở lại được sau này']}
        onXacNhan={lyDo => ketLuanTcth(d.ideaId, 'dung', lyDo)} />
    ),
    sang_hang_cho: (
      <Link to="/one/y-tuong/van-hanh?viec=duyet_ben_re"
        className="flex items-center gap-1.5 rounded-lg bg-[#005a9c] px-3 py-2 text-2xs font-black text-white hover:bg-[#00457a]">
        Quyết ở hàng chờ <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    ),
    sang_danh_gia: (
      <Link to="/one/y-tuong/van-hanh?viec=trinh_ben_re"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-2xs font-bold text-slate-700 hover:bg-slate-50">
        Chấm phiếu & trình <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    ),
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      {cacHanhDong.map(h => <React.Fragment key={h}>{nut[h]}</React.Fragment>)}
      <Link
        to={`/one/y-tuong/gui?y_tuong=${d.ideaId}`}
        className="ml-auto flex items-center gap-1 text-2xs font-bold text-[#005a9c] hover:underline"
        title="Mở ý tưởng ở bảng tra cứu — đủ bình luận, trao đổi"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Mở ở bảng tra cứu
      </Link>
    </div>
  );
}

function DongSo({ d, laGiamDoc, laQuanTri }: { d: DongSoBenReDayDu; laGiamDoc: boolean; laQuanTri: boolean }) {
  const [mo, setMo] = useState(false);
  const nhom = phanLoaiSoBenRe(d);
  const info = NHOM_SO_BEN_RE.find(n => n.ma === nhom)!;
  const noiDung = [
    { nhan: 'Thực trạng', giaTri: d.currentStatus },
    { nhan: 'Giải pháp đề xuất', giaTri: d.proposedSolution },
    { nhan: 'Lợi ích dự kiến', giaTri: d.expectedBenefits },
  ].filter(k => k.giaTri?.trim());

  return (
    <div className={`rounded-xl border bg-white ${mo ? 'border-[#005a9c]/40 shadow-sm' : 'border-slate-200'}`}>
      {/* Bấm cả dòng để mở — «ấn vào sáng kiến luôn» */}
      <button type="button" onClick={() => setMo(o => !o)} className="w-full cursor-pointer p-3 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-2xs font-black ${info.mau}`}>{info.ten}</span>
          {d.capDeXuat && (
            <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
              d.capDeXuat === 'Đề xuất TSC' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
            }`}>{d.capDeXuat}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
            d.coDemo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>{d.coDemo ? '🧪 Có demo' : 'Chưa có demo'}</span>
          {d.trangThai === 'da_ghi_nhan' && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-700">
              💰 {d.mucThuong.toLocaleString('vi-VN')}đ{d.ghiNhanKpi ? ' · KPI' : ''}
            </span>
          )}
          <span className="ml-auto text-slate-400">{mo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </div>
        <p className="mt-1 text-sm font-bold leading-snug text-slate-800">{d.title}</p>
        <p className="text-2xs text-slate-500">{d.phong} · {d.proposer}</p>
        <p className="mt-1 text-2xs text-slate-600"><DongMoTa d={d} /></p>
      </button>

      {mo && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {noiDung.map(k => (
            <p key={k.nhan} className="whitespace-pre-line rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
              <b className="text-slate-500">{k.nhan}:</b> {k.giaTri}
            </p>
          ))}

          {phieuCoNoiDung(d.danhGiaTcth) && (
            <BenReDanhGiaTomTat phieu={d.danhGiaTcth} tieuDe={`Báo cáo Phòng TCTH${d.nguoiTrinh ? ` — ${d.nguoiTrinh}` : ''}`} />
          )}
          {d.ghiChu?.trim() && (
            <p className="rounded-lg border border-sky-100 bg-sky-50 p-2 text-2xs text-sky-800"><b>Lời trình TCTH:</b> {d.ghiChu}</p>
          )}
          {d.yKienGd?.trim() && (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-2xs text-emerald-900">
              <b>Ý kiến Giám đốc{d.diemGd != null ? ` (phiếu ${d.diemGd}/10)` : ''}:</b> {d.yKienGd}
            </p>
          )}
          {d.boSungGhiChu?.trim() && (
            <p className="rounded-lg border border-violet-100 bg-violet-50 p-2 text-2xs text-violet-900"><b>Cán bộ đã bổ sung:</b> {d.boSungGhiChu}</p>
          )}
          {d.soLanThuHoi > 0 && (
            <p className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-2xs text-rose-800">
              Đã thu hồi {d.soLanThuHoi} lần{d.thuHoiLuc ? ` — gần nhất ${ngay(d.thuHoiLuc)}` : ''}{d.lyDoThuHoi ? `: «${d.lyDoThuHoi}»` : ''}
            </p>
          )}

          <DaiHanhDong d={d} laGiamDoc={laGiamDoc} laQuanTri={laQuanTri} />
        </div>
      )}
    </div>
  );
}

export const SoBenRePanel: React.FC = () => {
  const { roles } = useAuth();
  const { cauHinh } = useCauHinhIdeas();
  const { laGiamDoc: giamDocTheoHoSo } = useLaGiamDoc();
  const quyen = quyenTuVaiTro(roles, cauHinh.aiChonUomMam);
  const laGiamDoc = quyen.laGiamDoc || giamDocTheoHoSo;
  const laQuanTri = quyen.laQuanTri;

  const { soBenRe, isLoading } = useSoBenRe();
  const { soGhiNhan, isLoading: dangTaiSoDayDu } = useSoGhiNhanDayDu();
  const [dangXuat, setDangXuat] = useState(false);
  const [nhomChon, setNhomChon] = useState<NhomSoBenRe | 'tat_ca'>('tat_ca');
  const [tim, setTim] = useState('');
  const [xemHet, setXemHet] = useState(false);

  const ketXuat = async () => {
    setDangXuat(true);
    try {
      await downloadSoGhiNhanExcel(soGhiNhan);
      toast.success(`Đã kết xuất ${soGhiNhan.length} dòng sổ ghi nhận (mọi cấp) — 3 sheet: theo nguồn, theo phòng, chi tiết`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không kết xuất được');
    } finally {
      setDangXuat(false);
    }
  };

  const dem = useMemo(() => demTheoNhom(soBenRe), [soBenRe]);
  const tongCongNhan = dem.cong_nhan_gd + dem.cong_nhan_tsc + dem.cong_nhan_ca_hai;

  const loc = useMemo(() => {
    const theoNhom = nhomChon === 'tat_ca' ? soBenRe : soBenRe.filter(d => phanLoaiSoBenRe(d) === nhomChon);
    if (!tim.trim()) return theoNhom;
    return theoNhom.filter(d => khopTimKiem([d.title, d.proposer, d.phong].join(' '), tim));
  }, [soBenRe, nhomChon, tim]);
  const hien = xemHet ? loc : loc.slice(0, SO_HIEN);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 font-black text-slate-800">
          <BookOpen className="h-4 w-4 text-[#005a9c]" />
          Sổ Bén rễ — theo nguồn công nhận
        </p>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-black text-slate-600">
          {soBenRe.length} hồ sơ
        </span>
        <button
          type="button"
          disabled={dangXuat || dangTaiSoDayDu}
          onClick={() => void ketXuat()}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-2xs font-black text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {dangXuat ? 'Đang kết xuất…' : `Kết xuất Excel (${soGhiNhan.length} dòng, mọi cấp)`}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-2xs font-black uppercase tracking-wider text-emerald-700">Giám đốc duyệt</p>
          <p className="text-2xl font-black text-emerald-800">{dem.cong_nhan_gd + dem.cong_nhan_ca_hai}</p>
          <p className="text-2xs text-emerald-700">đường Chi nhánh{dem.cong_nhan_ca_hai ? ` · ${dem.cong_nhan_ca_hai} cũng được TSC đồng ý` : ''}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-2xs font-black uppercase tracking-wider text-sky-700">Trụ sở chính đồng ý</p>
          <p className="text-2xl font-black text-sky-800">{dem.cong_nhan_tsc + dem.cong_nhan_ca_hai}</p>
          <p className="text-2xs text-sky-700">đường TSC qua SMP</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-2xs font-black uppercase tracking-wider text-slate-500">Đã công nhận Bén rễ</p>
          <p className="text-2xl font-black text-slate-800">{tongCongNhan}</p>
          <p className="text-2xs text-slate-500">
            đang luân chuyển: {dem.cho_gd} chờ GĐ · {dem.tcth_tra_ve + dem.gd_tra_ve} trả về · {dem.da_bo_sung} đã bổ sung · {dem.nuoi_duong} nuôi dưỡng · {dem.dung} dừng
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => { setNhomChon('tat_ca'); setXemHet(false); }}
          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-colors ${
            nhomChon === 'tat_ca' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Tất cả <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 font-black">{soBenRe.length}</span>
        </button>
        {NHOM_SO_BEN_RE.map(n => (
          <button
            key={n.ma}
            type="button"
            onClick={() => { setNhomChon(n.ma); setXemHet(false); }}
            className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-colors ${
              nhomChon === n.ma ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {n.ten}
            <span className={`ml-1 rounded-full px-1.5 py-0.5 font-black ${dem[n.ma] > 0 ? n.mau : 'bg-slate-200 text-slate-500'}`}>
              {dem[n.ma]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={tim}
          onChange={e => setTim(e.target.value)}
          placeholder="Tìm theo tên ý tưởng, người đề xuất, phòng…"
          className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-amber-500"
        />
      </div>

      <p className="text-2xs italic text-slate-500">Bấm vào một dòng để đọc ý tưởng, phiếu chấm và thao tác ngay tại chỗ.</p>

      {isLoading ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Đang tải sổ…</p>
      ) : hien.length === 0 ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Không có hồ sơ nào trong nhóm này.</p>
      ) : (
        <div className="space-y-1.5">
          {hien.map(d => <DongSo key={d.ideaId} d={d} laGiamDoc={laGiamDoc} laQuanTri={laQuanTri} />)}
          {!xemHet && loc.length > SO_HIEN && (
            <button
              type="button"
              onClick={() => setXemHet(true)}
              className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600"
            >
              Xem thêm {loc.length - SO_HIEN} hồ sơ
            </button>
          )}
        </div>
      )}
    </div>
  );
};
