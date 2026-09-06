import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BellRing, BookOpen, CheckCircle2, Clock, Eye, FileText, Laptop, Link2, Mail, Monitor, Paperclip, Pencil, PenLine, Plus, Star, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { ngayVnChuoi } from '@/lib/lichNghi';
import {
  TTC_PHAN, TTC_TEN_NOI_NOP, TTC_TEN_PHU_TRACH, TTC_TEN_THIET_BI, TTC_TEN_TRANG_THAI,
  docCauHinhBao, moTaNguoiNhanBao, nhanNgay, ngayMacDinh, thieuDeTich, tichDuoc, tienDoNgay, trangThaiViec,
  type TtcDauViec, type TtcNgay, type TtcTep, type TtcTienDo,
} from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import {
  luuNopDauViec, luuSuyNgam, tichDauViec, xoaDauViec, xoaNgay,
  useTtcDauViec, useTtcDiemBloom, useTtcDiemDanh, useTtcKyTep, useTtcLamTuoi, useTtcNgay, useTtcSuyNgam, useTtcTienDo,
} from './useTrainingCenter';
import { TtcTheDiemDanh } from './TtcTheDiemDanh';
import { TTC_TEP_ACCEPT, TTC_TEP_TOI_DA, kichThuocDoc, taiTepTrainingCenter, xoaTepTrainingCenter } from './tepTrainingCenter';
import { TtcChamBloom } from './TtcChamBloom';
import { FormDauViec, FormNgay } from './TtcFormLoTrinh';

/**
 * LỘ TRÌNH — dải ngày, lịch chi tiết theo giờ của ngày đang chọn, ô tích hoàn
 * thành, xem trước ngày mai. Màn học viên dùng nhiều nhất, phải chạy tốt trên
 * điện thoại: mỗi đầu việc là một dòng có giờ, thiết bị và nơi nộp để học viên
 * không phải đoán làm trên máy nào, nộp ở đâu.
 *
 * Từ 06/09: BGĐ và quản trị SỬA ĐƯỢC LỘ TRÌNH NGAY TẠI ĐÂY (thêm/sửa/xoá ngày và
 * đầu việc, bật tính năng nộp tệp) — không phải sang màn Quản trị; đầu việc bật
 * «nộp tệp/ghi chú/đường dẫn» thì học viên nộp ngay trên dòng đó, chưa nộp thì
 * chưa tích được (máy chủ chặn). Dòng «Nhắc hôm nay» nói trước máy chủ sẽ push
 * lúc mấy giờ cho ai.
 */
export function TtcLoTrinh({ bc }: { bc: TtcBoiCanh }) {
  const { profileId, user } = useAuth();
  const ct = bc.chuongTrinh;
  const ctId = ct?.id ?? null;
  const hocVienId = bc.hocVien?.nguoi ?? null;
  const homNay = ngayVnChuoi(new Date());
  const suaDuoc = bc.laSuaDuocNoiDung;

  const { data: dsNgay = [], isLoading: dangTaiNgay } = useTtcNgay(ctId);
  const ngayIds = useMemo(() => dsNgay.map((n) => n.id), [dsNgay]);
  const { data: dsViec = [] } = useTtcDauViec(ctId, ngayIds);
  const viecIds = useMemo(() => dsViec.map((v) => v.id), [dsViec]);
  const { data: tienDo = [] } = useTtcTienDo(ctId, hocVienId, viecIds);
  const { data: dsDiem = [] } = useTtcDiemBloom(ctId, ngayIds);
  const { data: dsDiemDanh = [] } = useTtcDiemDanh(ctId, ngayIds);
  const lamTuoi = useTtcLamTuoi();

  const [ngayChon, setNgayChon] = useState<string | null>(null);
  const [xemNgayMai, setXemNgayMai] = useState(false);
  const [ngaySua, setNgaySua] = useState<Partial<TtcNgay> | null>(null);
  const [viecSua, setViecSua] = useState<Partial<TtcDauViec> | null>(null);
  useEffect(() => {
    if (!ngayChon && dsNgay.length) setNgayChon(ngayMacDinh(dsNgay, homNay)?.id ?? null);
  }, [dsNgay, ngayChon, homNay]);

  const ngay = dsNgay.find((n) => n.id === ngayChon) ?? null;
  const ngayMai = ngay ? dsNgay.find((n) => n.so_thu_tu === ngay.so_thu_tu + 1) ?? null : null;
  const ngayHien = xemNgayMai && ngayMai ? ngayMai : ngay;

  const viecCuaNgay = useMemo(
    () => dsViec.filter((v) => v.ngay_id === ngayHien?.id).sort((a, b) => a.gio_bat_dau.localeCompare(b.gio_bat_dau) || a.thu_tu - b.thu_tu),
    [dsViec, ngayHien],
  );
  const tienDoTheoViec = useMemo(() => new Map(tienDo.map((t) => [t.dau_viec_id, t])), [tienDo]);
  const daCham = useMemo(() => new Set(dsDiem.map((d) => d.ngay_id)), [dsDiem]);
  const cauHinhBao = useMemo(() => docCauHinhBao(ct?.nhac), [ct?.nhac]);

  const tien = tienDoNgay(viecCuaNgay, tienDo);
  const coTheTich = bc.laHocVien && !!ngayHien && tichDuoc(ngayHien, homNay);

  const tich = async (v: TtcDauViec, hoanThanh: boolean) => {
    if (!profileId) return;
    const td = tienDoTheoViec.get(v.id);
    if (hoanThanh) {
      const thieu = thieuDeTich(v, td);
      if (thieu.length) { toast.error(`Đầu việc này yêu cầu nộp trước khi tích hoàn thành. Còn thiếu: ${thieu.join(', ')}`); return; }
    }
    try {
      await tichDauViec(v.id, profileId, hoanThanh);
      lamTuoi();
      if (hoanThanh && tien.xong + 1 === tien.tong) {
        toast.success(`Đủ ${tien.tong}/${tien.tong} đầu việc của Ngày ${ngayHien!.so_thu_tu} — Ban Giám đốc đã được báo.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    }
  };

  const boNgay = async (n: TtcNgay) => {
    if (!window.confirm(`Xoá Ngày ${n.so_thu_tu} và toàn bộ đầu việc của ngày đó?`)) return;
    try { await xoaNgay(n.id); setNgayChon(null); lamTuoi(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
  };
  const boViec = async (v: TtcDauViec) => {
    if (!window.confirm('Xoá đầu việc này?')) return;
    try { await xoaDauViec(v.id); lamTuoi(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
  };
  const themNgay = () => {
    if (!ctId) return;
    const cuoi = dsNgay.at(-1);
    const ngayKe = cuoi ? new Date(Date.parse(cuoi.ngay) + 86_400_000).toISOString().slice(0, 10) : ct?.ngay_bd;
    setNgaySua({ chuong_trinh_id: ctId, so_thu_tu: (cuoi?.so_thu_tu ?? 0) + 1, ngay: ngayKe });
  };
  const themViec = () => {
    if (!ngayHien) return;
    setViecSua({ ngay_id: ngayHien.id, thu_tu: viecCuaNgay.length + 1, phan: 'THUC_HANH', nguoi_phu_trach: 'HOC_VIEN', thiet_bi: 'LAPTOP', noi_nop: 'TRAINING_CENTER', trong_tam: false, tinh_nang: [] });
  };

  if (dangTaiNgay) return <Skeleton className="h-64 rounded-2xl" />;
  if (!ngay) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Chương trình chưa có ngày nào.
        {suaDuoc && <div className="mt-3"><Button size="sm" onClick={themNgay}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm ngày đầu tiên</Button></div>}
        <FormNgay ngay={ngaySua} onClose={() => setNgaySua(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Điểm danh — chỉ hiện đúng ngày học hôm nay */}
      {ct && ngayHien && ngayHien.ngay === homNay && (
        <TtcTheDiemDanh bc={bc} ngay={ngayHien} dsDiemDanh={dsDiemDanh} />
      )}

      {/* Dải ngày */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {dsNgay.map((n) => {
          const chon = n.id === ngay.id;
          const vN = dsViec.filter((v) => v.ngay_id === n.id);
          const tdN = tienDoNgay(vN, tienDo);
          const laHomNay = n.ngay === homNay;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => { setNgayChon(n.id); setXemNgayMai(false); }}
              className={`flex min-w-[5.25rem] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 text-center transition ${
                chon ? 'border-brand-navy bg-brand-navy text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
              }`}
            >
              <span className={`text-2xs font-semibold uppercase tracking-wider ${chon ? 'text-white/70' : 'text-slate-400'}`}>Ngày {n.so_thu_tu}</span>
              <span className="text-xs font-bold">{nhanNgay(n.ngay).replace(/^Thứ /, 'T')}</span>
              <span className={`mt-1 text-2xs ${chon ? 'text-white/80' : tdN.du ? 'text-emerald-600' : 'text-slate-400'}`}>
                {tdN.tong ? `${tdN.xong}/${tdN.tong}` : '—'}{laHomNay ? ' · hôm nay' : ''}
              </span>
            </button>
          );
        })}
        {suaDuoc && (
          <button
            type="button"
            onClick={themNgay}
            className="flex min-w-[4rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-500 hover:border-brand-navy/40"
            aria-label="Thêm ngày"
          >
            <Plus className="h-4 w-4" /> Thêm ngày
          </button>
        )}
      </div>

      {/* Đầu ngày */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-widest text-[#A8763E]">
              Ngày {ngayHien!.so_thu_tu} · {nhanNgay(ngayHien!.ngay)}{ngayHien!.khoi ? ` · ${ngayHien!.khoi}` : ''}
            </p>
            <h2 className="mt-1 text-xl font-black text-brand-navy">{ngayHien!.tieu_de}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {suaDuoc && !xemNgayMai && (
              <>
                <Button size="sm" variant="outline" onClick={() => setNgaySua(ngayHien!)}><Pencil className="mr-1 h-3.5 w-3.5" /> Sửa ngày</Button>
                <Button size="sm" variant="outline" onClick={themViec}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm đầu việc</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" onClick={() => boNgay(ngayHien!)} aria-label="Xoá ngày"><Trash2 className="h-3.5 w-3.5" /></Button>
              </>
            )}
            {ngayMai && (
              <Button size="sm" variant={xemNgayMai ? 'default' : 'outline'} onClick={() => setXemNgayMai((v) => !v)}>
                <Eye className="mr-1 h-3.5 w-3.5" /> {xemNgayMai ? 'Về ngày đang chọn' : `Xem trước Ngày ${ngayMai.so_thu_tu}`}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {ngayHien!.van_ban && (
            <p className="rounded-xl bg-slate-50 p-3"><b className="text-brand-navy">Văn bản của ngày:</b> {ngayHien!.van_ban}</p>
          )}
          {ngayHien!.nhiem_vu_van_ban && (
            <p className="rounded-xl bg-slate-50 p-3"><b className="text-brand-navy">Thang Bloom tối thiểu:</b> {ngayHien!.nhiem_vu_van_ban}</p>
          )}
          {ngayHien!.chuan_bi && (
            <p className="rounded-xl bg-amber-50 p-3 sm:col-span-2"><b className="text-amber-800">Chuẩn bị tối hôm trước:</b> {ngayHien!.chuan_bi}</p>
          )}
        </div>

        {/* Ai biết khi tích xong — thay cho khối «nhắc trước giờ» đã bỏ 06/09/2026 */}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-dashed border-[#A8763E]/40 px-3 py-2 text-xs text-slate-600">
          <BellRing className="h-3.5 w-3.5 text-[#A8763E]" />
          <span className="font-semibold text-brand-navy">Khi tích hoàn thành:</span>
          <span>{moTaNguoiNhanBao(cauHinhBao, bc.thanhVien.length)}</span>
          {suaDuoc && ct && (
            <Link to={`/one/training-center/quan-tri?ct=${ct.id}`} className="ml-auto font-semibold text-brand-navy underline">Chỉnh «báo cho ai»</Link>
          )}
        </p>

        {/* Tiến độ */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">
              {tien.xong}/{tien.tong} đầu việc{tien.du ? ' — đủ, sẵn sàng để đánh giá' : ''}
            </span>
            <span className="text-slate-400">
              {tichDuoc(ngayHien!, homNay) ? (bc.laHocVien ? 'Tích từng ô khi xong' : 'Học viên tự tích') : 'Chưa mở — chỉ xem trước'}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#A8763E] transition-all" style={{ width: `${tien.tong ? (tien.xong / tien.tong) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Lịch chi tiết theo phần */}
      <div className="space-y-4">
        {viecCuaNgay.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            Ngày này chưa có đầu việc.{suaDuoc ? ' Bấm «Thêm đầu việc» để soạn.' : ''}
          </p>
        )}
        {TTC_PHAN.map((phan) => {
          const ds = viecCuaNgay.filter((v) => v.phan === phan.ma);
          if (ds.length === 0) return null;
          return (
            <section key={phan.ma}>
              <h3 className="mb-2 text-2xs font-bold uppercase tracking-widest text-slate-500">{phan.ten}</h3>
              <div className="space-y-2">
                {ds.map((v) => (
                  <DongDauViec
                    key={v.id}
                    v={v}
                    ngay={ngayHien!}
                    tienDo={tienDoTheoViec.get(v.id)}
                    daCham={daCham.has(ngayHien!.id)}
                    coTheTich={coTheTich}
                    homNay={homNay}
                    onTich={(x) => tich(v, x)}
                    laHocVien={bc.laHocVien}
                    nopDuoc={bc.laHocVien && !!ctId && !!profileId && !!user && tichDuoc(ngayHien!, homNay)}
                    ctId={ctId ?? ''}
                    profileId={profileId ?? ''}
                    userId={user?.id ?? ''}
                    suaDuoc={suaDuoc && !xemNgayMai}
                    onSua={() => setViecSua(v)}
                    onXoa={() => boViec(v)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Tự suy ngẫm của ngày — chỉ học viên */}
      {bc.laHocVien && profileId && ngayHien && (
        <OTuSuyNgam ngay={ngayHien} nguoi={profileId} ngayIds={ngayIds} />
      )}

      {/* Phiếu chấm Bloom — người hướng dẫn / BGĐ chấm; học viên xem sau công bố */}
      {ngayHien && hocVienId && (
        <TtcChamBloom bc={bc} ngay={ngayHien} hocVienId={hocVienId} dsDiem={dsDiem.filter((d) => d.ngay_id === ngayHien.id)} />
      )}

      <FormNgay ngay={ngaySua} onClose={() => setNgaySua(null)} />
      <FormDauViec viec={viecSua} onClose={() => setViecSua(null)} />
    </div>
  );
}

function DongDauViec({
  v, ngay, tienDo, daCham, coTheTich, homNay, onTich, laHocVien, nopDuoc, ctId, profileId, userId, suaDuoc, onSua, onXoa,
}: {
  v: TtcDauViec; ngay: TtcNgay; tienDo: TtcTienDo | undefined; daCham: boolean;
  coTheTich: boolean; homNay: string; onTich: (x: boolean) => void;
  laHocVien: boolean; nopDuoc: boolean; ctId: string; profileId: string; userId: string;
  suaDuoc: boolean; onSua: () => void; onXoa: () => void;
}) {
  const tt = trangThaiViec(ngay, tienDo, daCham, homNay);
  const IconTb = v.thiet_bi === 'MAY_CO_QUAN' ? Monitor : v.thiet_bi === 'LAPTOP' ? Laptop : v.thiet_bi === 'GIAY' ? PenLine : null;
  const coTinhNang = v.tinh_nang.length > 0;
  const daNop = (tienDo?.tep?.length ?? 0) > 0 || !!tienDo?.ghi_chu || !!tienDo?.duong_dan;
  const thieu = thieuDeTich(v, tienDo);
  return (
    <div className={`rounded-2xl border bg-white p-3 shadow-sm ${v.trong_tam ? 'border-[#A8763E]/50' : 'border-slate-200'} ${tt === 'HOAN_THANH' || tt === 'DA_DANH_GIA' ? 'opacity-80' : ''}`}>
      <div className="flex gap-3">
        <div className="flex w-14 shrink-0 flex-col items-center pt-0.5 text-center">
          <span className="text-sm font-bold tabular-nums text-brand-navy">{v.gio_bat_dau}</span>
          <span className="text-2xs tabular-nums text-slate-400">{v.gio_ket_thuc}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-slate-800">
            {v.trong_tam && <Star className="mr-1 inline h-3.5 w-3.5 fill-[#A8763E] text-[#A8763E]" aria-label="Trọng tâm" />}
            {v.ten}
          </p>
          {v.dau_ra && <p className="mt-1 text-xs text-slate-600"><b>Đầu ra:</b> {v.dau_ra}</p>}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {TTC_TEN_PHU_TRACH[v.nguoi_phu_trach]}</span>
            {IconTb && <span className="inline-flex items-center gap-1"><IconTb className="h-3 w-3" /> {TTC_TEN_THIET_BI[v.thiet_bi]}</span>}
            {v.noi_nop !== 'KHONG' && (
              <span className="inline-flex items-center gap-1">
                {v.noi_nop === 'EMAIL' ? <Mail className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />} {TTC_TEN_NOI_NOP[v.noi_nop]}
              </span>
            )}
            {v.tinh_nang.includes('NOP_TEP') && <span className="inline-flex items-center gap-1 font-semibold text-[#8A5E2C]"><Paperclip className="h-3 w-3" /> Nộp tệp</span>}
            <span className={`font-semibold ${tt === 'DA_DANH_GIA' ? 'text-emerald-700' : tt === 'HOAN_THANH' ? 'text-emerald-600' : tt === 'DANG_LAM' ? 'text-amber-700' : 'text-slate-400'}`}>
              {TTC_TEN_TRANG_THAI[tt]}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-1 pt-0.5">
          {suaDuoc && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500" onClick={onSua} aria-label="Sửa đầu việc"><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500" onClick={onXoa} aria-label="Xoá đầu việc"><Trash2 className="h-3.5 w-3.5" /></Button>
            </>
          )}
          {coTheTich ? (
            <Checkbox
              checked={!!tienDo?.hoan_thanh}
              onCheckedChange={(c) => onTich(c === true)}
              aria-label={`Hoàn thành: ${v.ten}`}
              className="h-6 w-6"
            />
          ) : tienDo?.hoan_thanh ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-label="Đã hoàn thành" />
          ) : null}
        </div>
      </div>

      {/* Nộp: tệp / ghi chú / đường dẫn — học viên nộp, người khác xem */}
      {(coTinhNang || daNop) && (
        <ONop
          v={v}
          tienDo={tienDo}
          nopDuoc={nopDuoc}
          ctId={ctId}
          profileId={profileId}
          userId={userId}
          thieu={laHocVien && !tienDo?.hoan_thanh ? thieu : []}
        />
      )}
    </div>
  );
}

/** Ô nộp của một đầu việc — tệp đính kèm, ghi chú kết quả, đường dẫn */
function ONop({ v, tienDo, nopDuoc, ctId, profileId, userId, thieu }: {
  v: TtcDauViec; tienDo: TtcTienDo | undefined; nopDuoc: boolean; ctId: string; profileId: string; userId: string; thieu: string[];
}) {
  const lamTuoi = useTtcLamTuoi();
  const tep = useMemo(() => tienDo?.tep ?? [], [tienDo?.tep]);
  const { data: url = {} } = useTtcKyTep(tep.map((t) => t.path));
  const [ghiChu, setGhiChu] = useState(tienDo?.ghi_chu ?? '');
  const [duongDan, setDuongDan] = useState(tienDo?.duong_dan ?? '');
  const [dangTai, setDangTai] = useState(false);
  const oTep = useRef<HTMLInputElement>(null);
  useEffect(() => { setGhiChu(tienDo?.ghi_chu ?? ''); setDuongDan(tienDo?.duong_dan ?? ''); }, [tienDo?.id, tienDo?.ghi_chu, tienDo?.duong_dan]);

  const canGhiChu = v.tinh_nang.includes('GHI_CHU');
  const canDuongDan = v.tinh_nang.includes('DUONG_DAN');
  const canTep = v.tinh_nang.includes('NOP_TEP');
  const daDoi = (ghiChu !== (tienDo?.ghi_chu ?? '')) || (duongDan !== (tienDo?.duong_dan ?? ''));

  const chonTep = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (tep.length + files.length > TTC_TEP_TOI_DA) { toast.error(`Tối đa ${TTC_TEP_TOI_DA} tệp cho một đầu việc.`); return; }
    setDangTai(true);
    try {
      const moi: TtcTep[] = [];
      for (const f of Array.from(files)) moi.push(await taiTepTrainingCenter(f, ctId, userId, v.id));
      await luuNopDauViec({ dau_viec_id: v.id, nguoi: profileId, tep: [...tep, ...moi] });
      lamTuoi();
      toast.success(moi.length === 1 ? 'Đã nộp tệp.' : `Đã nộp ${moi.length} tệp.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tải được tệp');
    } finally {
      setDangTai(false);
      if (oTep.current) oTep.current.value = '';
    }
  };
  const boTep = async (t: TtcTep) => {
    try {
      await luuNopDauViec({ dau_viec_id: v.id, nguoi: profileId, tep: tep.filter((x) => x.path !== t.path) });
      await xoaTepTrainingCenter([t.path]).catch(() => {});
      lamTuoi();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không bỏ được tệp'); }
  };
  const luuChu = async () => {
    try {
      await luuNopDauViec({ dau_viec_id: v.id, nguoi: profileId, ghi_chu: ghiChu.trim() || null, duong_dan: duongDan.trim() || null });
      lamTuoi(); toast.success('Đã lưu.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
      {/* Tệp */}
      {(canTep || tep.length > 0) && (
        <div>
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500"><Paperclip className="h-3 w-3" /> Tệp đã nộp {tep.length > 0 && `(${tep.length})`}</p>
          {tep.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {tep.map((t) => (
                <li key={t.path} className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-brand-navy" />
                  {url[t.path] ? (
                    <a href={url[t.path]} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-brand-navy underline">{t.ten}</a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-slate-700">{t.ten}</span>
                  )}
                  <span className="shrink-0 text-2xs text-slate-400">{kichThuocDoc(t.kich_thuoc)}</span>
                  {nopDuoc && <button type="button" onClick={() => boTep(t)} className="text-slate-400 hover:text-red-600" aria-label={`Bỏ tệp ${t.ten}`}><X className="h-4 w-4" /></button>}
                </li>
              ))}
            </ul>
          )}
          {nopDuoc && canTep && tep.length < TTC_TEP_TOI_DA && (
            <div className="mt-2">
              <input ref={oTep} type="file" accept={TTC_TEP_ACCEPT} multiple className="hidden" onChange={(e) => chonTep(e.target.files)} />
              <Button size="sm" variant="outline" className="min-h-[44px]" disabled={dangTai} onClick={() => oTep.current?.click()}>
                <Paperclip className="mr-1 h-3.5 w-3.5" /> {dangTai ? 'Đang tải…' : tep.length ? 'Nộp thêm tệp' : 'Nộp tệp đính kèm'}
              </Button>
              <span className="ml-2 text-2xs text-slate-400">PDF, Word, Excel, PowerPoint, ảnh · tối đa 20 MB/tệp</span>
            </div>
          )}
          {!nopDuoc && tep.length === 0 && <p className="mt-1 text-xs text-slate-400">Chưa nộp tệp nào.</p>}
        </div>
      )}

      {/* Ghi chú + đường dẫn */}
      {(canGhiChu || canDuongDan || tienDo?.ghi_chu || tienDo?.duong_dan) && (
        <div className={`space-y-2 ${(canTep || tep.length > 0) ? 'mt-3' : ''}`}>
          {(canGhiChu || tienDo?.ghi_chu) && (
            nopDuoc ? (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú kết quả</p>
                <Textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className="mt-1 bg-white" placeholder="Vài dòng: đã làm gì, kết quả ra sao, vướng ở đâu…" />
              </div>
            ) : tienDo?.ghi_chu ? <p className="text-slate-700"><b className="text-slate-500">Ghi chú:</b> {tienDo.ghi_chu}</p> : null
          )}
          {(canDuongDan || tienDo?.duong_dan) && (
            nopDuoc ? (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Đường dẫn</p>
                <Input value={duongDan} onChange={(e) => setDuongDan(e.target.value)} className="mt-1 bg-white" placeholder="https://…" inputMode="url" />
              </div>
            ) : tienDo?.duong_dan ? (
              <p className="flex items-center gap-1 text-slate-700"><Link2 className="h-3.5 w-3.5 text-brand-navy" /><a href={tienDo.duong_dan} target="_blank" rel="noreferrer" className="truncate text-brand-navy underline">{tienDo.duong_dan}</a></p>
            ) : null
          )}
          {nopDuoc && (canGhiChu || canDuongDan) && (
            <div className="flex justify-end"><Button size="sm" onClick={luuChu} disabled={!daDoi}>Lưu</Button></div>
          )}
        </div>
      )}

      {thieu.length > 0 && (
        <p className="mt-2 text-2xs text-amber-700">Chưa tích hoàn thành được — còn thiếu: {thieu.join(', ')}.</p>
      )}
    </div>
  );
}

/** Ô tự suy ngẫm của ngày — nội dung chỉ chính học viên đọc/ghi; vai khác chỉ thấy đã điền hay chưa */
function OTuSuyNgam({ ngay, nguoi, ngayIds }: { ngay: TtcNgay; nguoi: string; ngayIds: string[] }) {
  const { data: ds = [] } = useTtcSuyNgam(ngayIds, true);
  const lamTuoi = useTtcLamTuoi();
  const cu = ds.find((s) => s.ngay_id === ngay.id);
  const [noiDung, setNoiDung] = useState('');
  const [muc, setMuc] = useState<number | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => { setNoiDung(cu?.noi_dung ?? ''); setMuc(cu?.muc_tu_cham ?? null); }, [cu?.id, cu?.noi_dung, cu?.muc_tu_cham]);

  const luu = async () => {
    if (noiDung.trim().length < 10) { toast.error('Viết ít nhất ba dòng — mười ký tự trở lên.'); return; }
    setDangLuu(true);
    try {
      await luuSuyNgam({ ngay_id: ngay.id, nguoi, noi_dung: noiDung.trim(), muc_tu_cham: muc });
      lamTuoi();
      toast.success('Đã lưu. Phần này chỉ mình anh/chị đọc được.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  return (
    <div className="rounded-2xl border border-[#A8763E]/40 bg-[#FFFCF7] p-5 shadow-sm">
      <p className="text-2xs font-semibold uppercase tracking-widest text-[#8A5E2C]">Tự suy ngẫm · {ngay.lat_cat ?? 'Lát cắt của Cây'}</p>
      {ngay.cau_hoi_tu_soi && <p className="mt-1 text-sm font-medium leading-relaxed text-slate-800">{ngay.cau_hoi_tu_soi}</p>}
      <p className="mt-1 text-xs text-slate-500">
        Viết tay 10 phút rồi chép ba dòng vào đây. Nội dung này <b>không vào bất kỳ bảng điểm nào</b> và chỉ mình anh/chị đọc được — Ban Giám đốc và Phòng Tổng hợp chỉ thấy «đã điền».
      </p>
      <Textarea value={noiDung} onChange={(e) => setNoiDung(e.target.value)} rows={4} className="mt-3 bg-white" placeholder="Ba dòng của tôi hôm nay…" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <span className="mr-1">Tự chấm mức:</span>
          {[1, 2, 3, 4, 5].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuc(m)}
              className={`h-7 w-7 rounded-full border text-xs font-bold ${muc === m ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={luu} disabled={dangLuu}>{cu ? 'Cập nhật' : 'Lưu'}</Button>
      </div>
    </div>
  );
}
