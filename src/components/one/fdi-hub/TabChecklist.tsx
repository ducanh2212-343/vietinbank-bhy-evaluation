import React from 'react';
import { cn } from '@/lib/utils';
import { FDI_HUB_CHECKLIST } from '@/data/one/fdiHub';
import { DaiDauTab, ThanhTienDo, The, useLuuCucBo } from './dungChung';

/** Checklist trước/trong/sau mỗi giai đoạn — tích tại chỗ, lưu trên trình duyệt này */
export function TabChecklist() {
  const [daTich, datDaTich] = useLuuCucBo<Record<string, boolean>>('checklist', {});
  const tongMuc = FDI_HUB_CHECKLIST.reduce((s, g) => s + g.muc.length, 0);
  const tongXong = FDI_HUB_CHECKLIST.reduce((s, g) => s + g.muc.filter((_, i) => daTich[`${g.ma}:${i}`]).length, 0);

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="✅" tieuDe="Checklist thực hành nhanh" moTa="Tick trực tiếp trước/trong/sau mỗi giai đoạn — trạng thái tự lưu trên trình duyệt này" mau1="#00897B" mau2="#00B8A9" />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
        <span>
          Đã tích <b className="text-brand-navy">{tongXong}/{tongMuc}</b> mục. Tiến độ lưu trên máy này, không đồng bộ sang máy khác.
        </span>
        {tongXong > 0 && (
          <button type="button" onClick={() => datDaTich({})} className="font-bold text-slate-500 underline hover:text-red-600">
            Bỏ tích tất cả
          </button>
        )}
      </div>

      {FDI_HUB_CHECKLIST.map((g) => {
        const soXong = g.muc.filter((_, i) => daTich[`${g.ma}:${i}`]).length;
        return (
          <The key={g.ma} className="border-l-[5px]" style={{ borderLeftColor: g.mau }}>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl" style={{ background: g.mau }} aria-hidden>
                {g.bieuTuong}
              </span>
              <h3 className="text-sm font-extrabold text-brand-navy sm:text-base">{g.tieuDe}</h3>
              <span className="ml-auto text-xs font-bold" style={{ color: g.mau }}>
                {soXong}/{g.muc.length}
              </span>
            </div>
            <ThanhTienDo phanTram={(soXong / g.muc.length) * 100} mau={g.mau} className="my-3 h-2" />
            <ul className="space-y-1">
              {g.muc.map((m, i) => {
                const khoa = `${g.ma}:${i}`;
                const id = `fdi-chk-${khoa.replace(':', '-')}`;
                const xong = !!daTich[khoa];
                return (
                  <li key={khoa} className="flex items-start gap-2.5 py-1 text-sm">
                    <input
                      id={id}
                      type="checkbox"
                      checked={xong}
                      onChange={(e) => datDaTich((c) => ({ ...c, [khoa]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded"
                      style={{ accentColor: g.mau }}
                    />
                    <label htmlFor={id} className={cn('cursor-pointer leading-relaxed text-slate-800', xong && 'text-slate-500 line-through')}>
                      {m}
                    </label>
                  </li>
                );
              })}
            </ul>
          </The>
        );
      })}
    </div>
  );
}
