import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Copy, GraduationCap, KeyRound, Layers, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  TTC_TEN_TRANG_THAI_CT, TTC_TEN_VAI, duongDanChuongTrinh, xepChuongTrinhCuaToi, xepDanhMuc,
  type TtcChuongTrinh, type TtcThanhVien,
} from '@/lib/trainingCenter';
import { TtcLoi } from './TrainingNav';
import { TtcGioiThieu } from './TtcGioiThieu';
import { useTtcDanhMuc, useTtcGhiDanhCuaToi } from './useTrainingCenter';

/**
 * TRANG CHỦ TRUNG TÂM — danh mục chương trình.
 *
 * Training Center là trung tâm NHIỀU chương trình cho bốn nhóm đối tượng, không
 * phải màn hình của một chương trình. Vì vậy trang chủ mở ra là: (1) chương
 * trình CỦA TÔI — thứ người đang học/đang chấm cần ngay; (2) danh mục theo bốn
 * nhóm, kể cả nhóm chưa có chương trình để Phòng TCTH thấy chỗ trống; (3) giới
 * thiệu khung Cây trưởng thành cho người chưa vào chương trình nào.
 */
export function TtcDanhMuc() {
  const { roles } = useAuth();
  const laTcth = roles.includes('tcth_admin') || roles.includes('system_admin');
  const { data, isLoading, isError, error } = useTtcDanhMuc();
  const { data: yeuCau = [] } = useTtcGhiDanhCuaToi();

  const vaiTheoCt = useMemo(() => new Map((data?.cuaToi ?? []).map((t) => [t.chuong_trinh_id, t])), [data]);
  const cuaToi = useMemo(
    () => xepChuongTrinhCuaToi((data?.chuongTrinh ?? []).filter((c) => vaiTheoCt.has(c.id))),
    [data, vaiTheoCt],
  );
  const danhMuc = useMemo(() => xepDanhMuc(data?.chuongTrinh ?? []), [data]);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (isError) return <><TtcLoi error={error} /><TtcGioiThieu /></>;

  return (
    <div className="space-y-8">
      {/* 1. Chương trình của tôi */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-red">
          <GraduationCap className="h-4 w-4" /> Chương trình của tôi
        </h2>
        {cuaToi.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Anh/chị chưa thuộc chương trình nào. Khi được Phòng Tổng hợp xếp vào một chương trình, nó sẽ hiện ở đây với lộ trình và bảng việc — hoặc nhập mã lớp ở dưới nếu được phát mã.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cuaToi.map((c) => <TheChuongTrinh key={c.id} c={c} vai={vaiTheoCt.get(c.id)} noiBat />)}
          </div>
        )}

        {/* Đang chờ TCTH duyệt — để cán bộ không xin lại lần hai */}
        {yeuCau.filter((y) => y.trang_thai === 'cho_duyet').map((y) => {
          const c = (data?.chuongTrinh ?? []).find((x) => x.id === y.chuong_trinh_id);
          return (
            <p key={y.id} className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Clock className="h-4 w-4 shrink-0" /> Yêu cầu vào lớp «{c?.ten ?? 'đang tải'}» đang chờ Phòng Tổng hợp duyệt.
            </p>
          );
        })}

        {/* Ghi danh bằng mã lớp — chỉ cán bộ nội bộ (RLS/RPC chặn khách) */}
        <Link to="/one/training-center/ghi-danh" className="mt-3 flex items-center gap-3 rounded-2xl border border-[#A8763E]/30 bg-[#A8763E]/5 px-4 py-3 text-sm transition hover:border-[#A8763E]/60">
          <KeyRound className="h-5 w-5 shrink-0 text-[#8A5E2C]" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-[#8A5E2C]">Có mã lớp? Nhập mã để ghi danh</span>
            <span className="block text-2xs text-slate-500">Phòng Tổng hợp phát mã 6 ký tự hoặc tấm QR khi mở lớp.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#8A5E2C]" />
        </Link>
      </section>

      {/* 2. Danh mục theo bốn nhóm đối tượng */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy">
            <Layers className="h-4 w-4" /> Danh mục chương trình theo nhóm đối tượng
          </h2>
          {laTcth && (
            <Link to="/one/training-center/quan-tri" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:underline">
              Tạo hoặc nhân bản chương trình <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <div className="space-y-4">
          {danhMuc.map(({ nhom, chuongTrinh }) => (
            <div key={nhom.ma} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-brand-navy">{nhom.ten}</h3>
                <span className="text-2xs text-slate-400">{chuongTrinh.length} chương trình</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{nhom.nhuCau}</p>
              {chuongTrinh.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Chưa có chương trình. Dự kiến: {nhom.duKien}.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {chuongTrinh.map((c) => <TheChuongTrinh key={c.id} c={c} vai={vaiTheoCt.get(c.id)} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Giới thiệu khung */}
      <details className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" open={cuaToi.length === 0}>
        <summary className="cursor-pointer text-sm font-bold text-brand-navy">Về Bắc Hưng Yên Training Center và Cây trưởng thành nghề nghiệp</summary>
        <div className="mt-4"><TtcGioiThieu /></div>
      </details>
    </div>
  );
}

function TheChuongTrinh({ c, vai, noiBat = false }: { c: TtcChuongTrinh; vai?: TtcThanhVien; noiBat?: boolean }) {
  const mauTrangThai = c.trang_thai === 'DANG_CHAY' ? 'bg-emerald-100 text-emerald-800'
    : c.trang_thai === 'CHUAN_BI' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';
  const ngay = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
  const noiDung = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug text-brand-navy">{c.ten}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-2xs text-slate-500">
            {c.loai && <span>{c.loai}</span>}
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {ngay(c.ngay_bd)} → {ngay(c.ngay_kt)}</span>
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${mauTrangThai}`}>{TTC_TEN_TRANG_THAI_CT[c.trang_thai]}</span>
      </div>
      {c.mo_ta && <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">{c.mo_ta}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs">
        {c.khoi_nang_luc && <span className="rounded-full bg-[#A8763E]/10 px-2 py-0.5 text-[#8A5E2C]">{c.khoi_nang_luc}</span>}
        {c.la_mau && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600"><Copy className="h-3 w-3" /> Mẫu</span>}
        {vai && <span className="inline-flex items-center gap-1 rounded-full bg-brand-navy/10 px-2 py-0.5 font-semibold text-brand-navy"><Users className="h-3 w-3" /> {TTC_TEN_VAI[vai.vai]}</span>}
      </div>
    </>
  );
  const lop = `flex flex-col rounded-2xl border p-4 transition ${noiBat ? 'border-[#A8763E]/50 bg-[#FFFCF7] shadow-sm hover:shadow-md' : 'border-slate-200 bg-white hover:border-brand-navy/40'}`;
  return vai ? (
    <Link to={duongDanChuongTrinh(c.id)} className={lop}>
      {noiDung}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy">
        Vào chương trình <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  ) : (
    <div className={lop}>
      {noiDung}
      <span className="mt-3 text-2xs text-slate-400">Chỉ thành viên chương trình mới mở được lộ trình.</span>
    </div>
  );
}
