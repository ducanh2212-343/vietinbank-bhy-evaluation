import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Clock, Eye, Laptop, Mail, Monitor, PenLine, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { ngayVnChuoi } from '@/lib/lichNghi';
import {
  TTC_PHAN, TTC_TEN_NOI_NOP, TTC_TEN_PHU_TRACH, TTC_TEN_THIET_BI, TTC_TEN_TRANG_THAI,
  nhanNgay, ngayMacDinh, tichDuoc, tienDoNgay, trangThaiViec,
  type TtcDauViec, type TtcNgay, type TtcTienDo,
} from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import {
  luuSuyNgam, tichDauViec, useTtcDauViec, useTtcDiemBloom, useTtcLamTuoi, useTtcNgay, useTtcSuyNgam, useTtcTienDo,
} from './useTrainingCenter';
import { TtcChamBloom } from './TtcChamBloom';

/**
 * LỘ TRÌNH — dải ngày, lịch chi tiết theo giờ của ngày đang chọn, ô tích hoàn
 * thành, xem trước ngày mai. Màn học viên dùng nhiều nhất, phải chạy tốt trên
 * điện thoại: mỗi đầu việc là một dòng có giờ, thiết bị và nơi nộp để học viên
 * không phải đoán làm trên máy nào, nộp ở đâu.
 */
export function TtcLoTrinh({ bc }: { bc: TtcBoiCanh }) {
  const { profileId } = useAuth();
  const ctId = bc.chuongTrinh?.id ?? null;
  const hocVienId = bc.hocVien?.nguoi ?? null;
  const homNay = ngayVnChuoi(new Date());

  const { data: dsNgay = [], isLoading: dangTaiNgay } = useTtcNgay(ctId);
  const ngayIds = useMemo(() => dsNgay.map((n) => n.id), [dsNgay]);
  const { data: dsViec = [] } = useTtcDauViec(ctId, ngayIds);
  const viecIds = useMemo(() => dsViec.map((v) => v.id), [dsViec]);
  const { data: tienDo = [] } = useTtcTienDo(ctId, hocVienId, viecIds);
  const { data: dsDiem = [] } = useTtcDiemBloom(ctId, ngayIds);
  const lamTuoi = useTtcLamTuoi();

  const [ngayChon, setNgayChon] = useState<string | null>(null);
  const [xemNgayMai, setXemNgayMai] = useState(false);
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

  const tien = tienDoNgay(viecCuaNgay, tienDo);
  const coTheTich = bc.laHocVien && !!ngayHien && tichDuoc(ngayHien, homNay);

  const tich = async (v: TtcDauViec, hoanThanh: boolean) => {
    if (!profileId) return;
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

  if (dangTaiNgay) return <Skeleton className="h-64 rounded-2xl" />;
  if (!ngay) return <p className="text-center text-sm text-slate-500">Chương trình chưa có ngày nào.</p>;

  return (
    <div className="space-y-5">
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
          <div className="flex items-center gap-2">
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
    </div>
  );
}

function DongDauViec({ v, ngay, tienDo, daCham, coTheTich, homNay, onTich }: {
  v: TtcDauViec; ngay: TtcNgay; tienDo: TtcTienDo | undefined; daCham: boolean;
  coTheTich: boolean; homNay: string; onTich: (x: boolean) => void;
}) {
  const tt = trangThaiViec(ngay, tienDo, daCham, homNay);
  const IconTb = v.thiet_bi === 'MAY_CO_QUAN' ? Monitor : v.thiet_bi === 'LAPTOP' ? Laptop : v.thiet_bi === 'GIAY' ? PenLine : null;
  return (
    <div className={`flex gap-3 rounded-2xl border bg-white p-3 shadow-sm ${v.trong_tam ? 'border-[#A8763E]/50' : 'border-slate-200'} ${tt === 'HOAN_THANH' || tt === 'DA_DANH_GIA' ? 'opacity-80' : ''}`}>
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
          <span className={`font-semibold ${tt === 'DA_DANH_GIA' ? 'text-emerald-700' : tt === 'HOAN_THANH' ? 'text-emerald-600' : tt === 'DANG_LAM' ? 'text-amber-700' : 'text-slate-400'}`}>
            {TTC_TEN_TRANG_THAI[tt]}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-start pt-0.5">
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
