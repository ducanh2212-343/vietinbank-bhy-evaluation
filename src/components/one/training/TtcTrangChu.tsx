import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Columns3, Route, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ngayVnChuoi } from '@/lib/lichNghi';
import {
  TTC_TEN_VAI, canBgd, duongDanChuongTrinh, gioNgan, nhanNgay, ngayMacDinh, tienDoNgay,
} from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import { useTtcDauViec, useTtcNgay, useTtcTienDo, useTtcViecGoiDau } from './useTrainingCenter';
import { TtcKanban } from './TtcKanban';

/**
 * TỔNG QUAN MỘT CHƯƠNG TRÌNH cho thành viên: hôm nay là ngày mấy, tiến độ tới
 * đâu, khung giờ Ban Giám đốc kế tiếp, Kanban hàng ngày (thẻ thật từ Chiêu
 * thức 2 với ba việc gối đầu mang huy hiệu) và ai đang trong chương trình.
 * Danh mục và giới thiệu trung tâm nằm ở trang chủ Training Center.
 */
export function TtcTrangChu({ bc }: { bc: TtcBoiCanh }) {
  const ct = bc.chuongTrinh!;
  const hocVienId = bc.hocVien?.nguoi ?? null;
  const homNay = ngayVnChuoi(new Date());
  const { data: dsNgay = [] } = useTtcNgay(ct.id);
  const ngayIds = useMemo(() => dsNgay.map((n) => n.id), [dsNgay]);
  const { data: dsViec = [] } = useTtcDauViec(ct.id, ngayIds);
  const viecIds = useMemo(() => dsViec.map((v) => v.id), [dsViec]);
  const { data: tienDo = [] } = useTtcTienDo(ct.id, hocVienId, viecIds);
  const { data: dsGoiDau = [] } = useTtcViecGoiDau(ct.id, hocVienId);

  const ngay = ngayMacDinh(dsNgay, homNay);
  const viecNgay = useMemo(() => dsViec.filter((v) => v.ngay_id === ngay?.id), [dsViec, ngay]);
  const tien = tienDoNgay(viecNgay, tienDo);
  const laHomNay = ngay?.ngay === homNay;
  const gioHienTai = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  // gioNgan hai vế: cột time trả 'HH:MM:SS', so thẳng với 'HH:MM' thì việc kết thúc
  // đúng phút này vẫn bị tính là còn tới
  const slotBgdKe = viecNgay.filter(canBgd).find((v) => !laHomNay || gioNgan(v.gio_ket_thuc) > gioHienTai) ?? null;
  const daNghiemThu = dsGoiDau.filter((g) => g.nghiem_thu_ket_qua === 'dat').length;
  // Giữ học viên đang xem khi chuyển màn (người hướng dẫn/BGĐ xem nhiều học viên)
  const duoi = !bc.laHocVien && hocVienId ? `?hv=${hocVienId}` : '';
  const daGiao = dsGoiDau.filter((g) => g.khoa_chuan).length;

  return (
    <div className="space-y-6">
      {/* Hôm nay */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-brand-navy/20 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-2xs font-semibold uppercase tracking-widest text-brand-red">
            {laHomNay ? 'Hôm nay' : ngay && ngay.ngay > homNay ? 'Ngày kế tiếp' : 'Ngày gần nhất'}
          </p>
          {ngay ? (
            <>
              <h2 className="mt-1 text-xl font-black text-brand-navy">Ngày {ngay.so_thu_tu} · {ngay.tieu_de}</h2>
              <p className="text-sm text-slate-500">{nhanNgay(ngay.ngay)}{ngay.khoi ? ` · ${ngay.khoi}` : ''}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-3xl font-black tabular-nums text-brand-navy">{tien.xong}<span className="text-base font-semibold text-slate-400">/{tien.tong}</span></p>
                  <p className="text-2xs font-semibold uppercase text-slate-500">đầu việc đã tích</p>
                </div>
                <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#A8763E]" style={{ width: `${tien.tong ? (tien.xong / tien.tong) * 100 : 0}%` }} />
                </div>
              </div>
              {slotBgdKe && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-sm text-slate-700">
                  <CalendarClock className="h-4 w-4 shrink-0 text-[#A8763E]" />
                  <span><b>{gioNgan(slotBgdKe.gio_bat_dau)}–{gioNgan(slotBgdKe.gio_ket_thuc)}</b> cần Ban Giám đốc: {slotBgdKe.ten}</span>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm"><Link to={duongDanChuongTrinh(ct.id, 'lo-trinh') + duoi}><Route className="mr-1 h-4 w-4" /> Mở lộ trình ngày này</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to={duongDanChuongTrinh(ct.id, 'bang-viec') + duoi}><Columns3 className="mr-1 h-4 w-4" /> Bảng việc</Link></Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Chương trình chưa có lịch ngày.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Ba việc gối đầu</p>
            <p className="mt-1 text-sm text-slate-700">
              Đã lập <b>{dsGoiDau.length}/3</b> · đã giao <b>{daGiao}/3</b> · nghiệm thu Đạt <b>{daNghiemThu}/3</b>
            </p>
            <Link to={duongDanChuongTrinh(ct.id, 'bang-viec') + duoi} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:underline">
              Xem bảng việc <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" /> Trong chương trình</p>
            <ul className="mt-2 space-y-1 text-sm">
              {bc.thanhVien.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-800">{t.full_name ?? '—'}</span>
                  <span className="shrink-0 text-2xs font-semibold uppercase text-slate-400">{TTC_TEN_VAI[t.vai]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-slate-400">{ct.ngay_bd.split('-').reverse().join('/')} → {ct.ngay_kt.split('-').reverse().join('/')}</p>
          </div>
        </div>
      </div>

      {/* Kanban hàng ngày — thẻ thật từ Chiêu thức 2 */}
      <div className="rounded-2xl border border-brand-navy/20 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-brand-red">
              <Columns3 className="h-4 w-4" /> Kanban hàng ngày{bc.hocVien?.full_name ? ` · ${bc.hocVien.full_name}` : ''}
            </p>
            <p className="mt-1 text-sm text-slate-600">Ba thẻ mang huy hiệu ①②③ là ba phiếu giao việc cho cán bộ; các thẻ còn lại là việc thật ở Chiêu thức 2.</p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/one/chieu-thuc-2">Mở Chiêu thức 2 <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        <TtcKanban ctId={ct.id} hocVienId={hocVienId} dsGoiDau={dsGoiDau} gon keoDuoc={bc.laHocVien} />
      </div>

    </div>
  );
}
