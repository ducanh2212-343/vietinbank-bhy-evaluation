import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FDI_HUB_CAC_BUOC } from '@/data/one/fdiHub';
import { DaiDauTab, DayChip, GoiY, ReNhanh, ThanhTienDo, The, TieuDeMuc, useLuuCucBo } from './dungChung';

/*
 * Hành trình 6 bước: dải mốc tròn ở trên, chi tiết bước đang chọn ở dưới.
 *
 * Tiến độ («đã hoàn thành bước», từng việc đã tích) lưu trên trình duyệt như
 * bản gốc — đây là công cụ tự luyện của từng RM cho một lượt tiếp cận, không
 * phải hồ sơ theo dõi khách hàng. Nút «Làm lại từ đầu» xóa sạch để bắt đầu
 * lượt mới.
 */

type TienDo = { buocXong: Record<string, boolean>; viecXong: Record<string, boolean> };
const TIEN_DO_TRONG: TienDo = { buocXong: {}, viecXong: {} };

export function TabHanhTrinh() {
  const buoc = FDI_HUB_CAC_BUOC;
  const [chon, datChon] = useState(0);
  const [tienDo, datTienDo] = useLuuCucBo<TienDo>('hanh-trinh', TIEN_DO_TRONG);
  const chiTietRef = useRef<HTMLDivElement>(null);
  const lanDau = useRef(true);

  const soXong = buoc.filter((b) => tienDo.buocXong[b.ma]).length;
  const b = buoc[chon];
  const khoaViec = (ma: string, i: number) => `${ma}:${i}`;
  const soViecXong = b.viecCanLam.filter((_, i) => tienDo.viecXong[khoaViec(b.ma, i)]).length;
  const daXong = !!tienDo.buocXong[b.ma];

  // Đổi bước thì cuộn xuống phần chi tiết — trừ lần dựng đầu để không giật trang
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    chiTietRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [chon]);

  const datBuocXong = (ma: string, xong: boolean) =>
    datTienDo((c) => ({ ...c, buocXong: { ...c.buocXong, [ma]: xong } }));
  const datViecXong = (khoa: string, xong: boolean) =>
    datTienDo((c) => ({ ...c, viecXong: { ...c.viecXong, [khoa]: xong } }));

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="🧭" tieuDe="Hành trình 6 bước chinh phục khách hàng FDI" moTa="Bấm vào từng mốc để mở hướng dẫn, mẫu biểu và việc cần làm — xong bước nào đánh dấu hoàn thành" mau1="#4527A0" mau2="#2979FF" />

      <The className="bg-gradient-to-br from-[#FCFBFF] to-[#F4F8FF]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TieuDeMuc className="mb-0">🗺️ Tiến độ lượt tiếp cận này</TieuDeMuc>
          {(soXong > 0 || Object.keys(tienDo.viecXong).length > 0) && (
            <button
              type="button"
              onClick={() => datTienDo(TIEN_DO_TRONG)}
              className="text-xs font-bold text-slate-500 underline hover:text-red-600"
            >
              Làm lại từ đầu
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ThanhTienDo phanTram={(soXong / buoc.length) * 100} className="h-3" />
          <span className="whitespace-nowrap text-xs font-bold text-brand-navy">{soXong}/{buoc.length} bước đã hoàn thành</span>
        </div>

        <ol className="mt-5 flex items-start justify-between gap-0.5 overflow-x-auto px-1 pb-1 pt-3">
          {buoc.map((s, i) => {
            const xong = !!tienDo.buocXong[s.ma];
            const dangChon = i === chon;
            return (
              <li key={s.ma} className="relative flex min-w-[64px] flex-1 flex-col items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="absolute right-1/2 top-[27px] h-1 w-full rounded-full sm:top-[29px]"
                    style={{ background: `linear-gradient(90deg, ${buoc[i - 1].mau}, ${s.mau})` }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => datChon(i)}
                  aria-current={dangChon ? 'step' : undefined}
                  aria-label={`${s.ma} · ${s.ten}${xong ? ' (đã hoàn thành)' : ''}`}
                  className={cn(
                    'relative z-10 grid h-14 w-14 place-items-center rounded-full border-[3px] bg-white text-2xl shadow transition-transform sm:h-[60px] sm:w-[60px]',
                    dangChon ? 'scale-110' : 'hover:scale-105',
                  )}
                  style={{
                    borderColor: s.mau,
                    background: dangChon ? s.mau : xong ? s.mauNhat : '#fff',
                    boxShadow: dangChon ? `0 0 0 5px ${s.mauNhat}` : undefined,
                  }}
                >
                  <span aria-hidden>{s.bieuTuong}</span>
                  <span className="absolute -bottom-2 rounded-md px-1.5 text-[10px] font-black text-white" style={{ background: s.mau }}>
                    {s.ma}
                  </span>
                  {xong && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-green-700 text-white shadow">
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </span>
                  )}
                </button>
                <span className="mt-4 text-center text-2xs font-extrabold" style={{ color: s.mau }}>
                  {s.ten}
                </span>
              </li>
            );
          })}
        </ol>
      </The>

      <div ref={chiTietRef} className="scroll-mt-24 overflow-hidden rounded-2xl bg-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-white sm:px-6" style={{ background: b.mau }}>
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-3xl" aria-hidden>
              {b.bieuTuong}
            </span>
            <div>
              <div className="text-2xs font-bold uppercase tracking-widest text-white/85">
                Bước {b.ma.slice(1)} · {b.ten}
              </div>
              <h3 className="text-base font-black sm:text-lg">{b.tieuDe}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => datBuocXong(b.ma, !daXong)}
            className={cn(
              'rounded-full border-[1.5px] px-4 py-2 text-xs font-extrabold transition-colors',
              daXong ? 'border-white bg-white' : 'border-white/60 bg-white/15 text-white hover:bg-white/30',
            )}
            style={daXong ? { color: b.mau } : undefined}
          >
            {daXong ? '✓ Đã hoàn thành' : 'Đánh dấu hoàn thành'}
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-800" style={{ background: b.mauNhat }}>
            🎯 <b>Mục tiêu:</b> {b.mucTieu}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-extrabold" style={{ color: b.mau }}>
              ✅ Việc cần làm <span className="text-xs font-semibold text-slate-500">({soViecXong}/{b.viecCanLam.length})</span>
            </div>
            <ul className="space-y-1.5">
              {b.viecCanLam.map((v, i) => {
                const khoa = khoaViec(b.ma, i);
                const xong = !!tienDo.viecXong[khoa];
                const id = `fdi-viec-${b.ma}-${i}`;
                return (
                  <li key={khoa} className="flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm" style={{ background: xong ? b.mauNhat : '#F7F9FB' }}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={xong}
                      onChange={(e) => datViecXong(khoa, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded"
                      style={{ accentColor: b.mau }}
                    />
                    <label htmlFor={id} className={cn('cursor-pointer leading-relaxed', xong && 'text-slate-500 line-through')}>
                      {v}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {b.reNhanh && (
            <div>
              <div className="mb-2 text-sm font-extrabold" style={{ color: b.mau }}>🔀 Điểm quyết định</div>
              <ReNhanh khong={b.reNhanh.khong} co={b.reNhanh.co} />
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-extrabold" style={{ color: b.mau }}>🏁 Kết quả / đầu ra</div>
            <div className="rounded-xl px-4 py-3 text-sm leading-relaxed text-slate-800" style={{ background: b.mauNhat }}>{b.ketQua}</div>
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold" style={{ color: b.mau }}>🧰 Công cụ hỗ trợ</div>
            <div className="rounded-xl px-4 py-3 text-sm italic leading-relaxed text-slate-800" style={{ background: b.mauNhat }}>{b.congCu}</div>
            <DayChip lienKet={b.lienKet} className="mt-2" />
          </div>

          <GoiY>
            ⚠️ <b>Lưu ý — lỗi RM mới hay gặp:</b> {b.luuY}
          </GoiY>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={chon === 0}
            onClick={() => datChon(chon - 1)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-brand-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" /> Bước trước
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {buoc.map((s, i) => (
              <button
                key={s.ma}
                type="button"
                tabIndex={-1}
                onClick={() => datChon(i)}
                className={cn('h-2.5 rounded-full transition-all', i === chon ? 'w-6' : 'w-2.5')}
                style={{ background: i === chon || tienDo.buocXong[s.ma] ? s.mau : '#DDE3E9', opacity: i !== chon && tienDo.buocXong[s.ma] ? 0.5 : 1 }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={chon === buoc.length - 1}
            onClick={() => datChon(chon + 1)}
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-35"
            style={{ background: b.mau }}
          >
            Bước tiếp theo <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
