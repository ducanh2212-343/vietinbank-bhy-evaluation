import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FDI_HUB_TABS } from '@/data/one/fdiHub';
import {
  CAC_KHOANG_THOI_GIAN,
  KHOANG_MAC_DINH,
  mucToO,
  ngayGioNgan,
  tomTatPhongGiaoDich,
  type MaKhoangThoiGian,
  type PhongThongKe,
  type ThongKeFdiHub,
} from '@/lib/fdiHubThongKe';
import { useFdiHubThongKe } from './useFdiHubLuotXem';
import { DaiDauTab, GoiY, Pill, The, TieuDeMuc, TieuDePhu } from './dungChung';

/**
 * Thống kê sử dụng FDI Hub — chỉ lãnh đạo phòng, PGĐ, BGĐ, TCTH thấy tab này
 * (trang gác ở giao diện, hàm SQL gác thật).
 *
 * Bố cục đi từ câu hỏi của Giám đốc xuống: (1) Phòng giao dịch nào đã dùng,
 * (2) tab nào được dùng, (3) từng phòng — người, lượt, tỷ lệ phủ, (4) ma trận
 * phòng × tab để thấy phòng đang đọc phần nào. Chỉ số theo PHÒNG, không có tên
 * người: mục đích là biết phòng nào đang tiếp cận, không phải soi từng cán bộ.
 */
export function TabThongKe() {
  const [khoang, datKhoang] = useState<MaKhoangThoiGian>(KHOANG_MAC_DINH);
  const { thongKe, dangTai, chuaApMigration, khongDuQuyen, loi, taiLai } = useFdiHubThongKe(khoang);

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="📊" tieuDe="Thống kê sử dụng FDI Hub" moTa="Phòng nào đang dùng cẩm nang, dùng phần nào — theo dõi các Phòng giao dịch trong quá trình tiếp cận khách hàng FDI" mau1="#00337A" mau2="#0072BC" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Khoảng thời gian">
          {CAC_KHOANG_THOI_GIAN.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => datKhoang(k.id)}
              aria-pressed={khoang === k.id}
              className={cn('rounded-xl px-3 py-1.5 text-xs font-bold transition-colors', khoang === k.id ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100')}
            >
              {k.nhan}
            </button>
          ))}
        </div>
        <button type="button" onClick={taiLai} className="inline-flex items-center gap-1 text-xs font-bold text-brand-royal hover:underline">
          <RefreshCw className={cn('h-3.5 w-3.5', dangTai && 'animate-spin')} /> Tải lại
        </button>
      </div>

      {chuaApMigration && (
        <GoiY>
          ⚠️ Chưa bật ghi nhận lượt sử dụng trên hệ thống (migration <code>20261022090000_fdi_hub_luot_xem</code> chưa áp). Phòng TCTH áp xong là số liệu bắt đầu tích luỹ từ lúc đó.
        </GoiY>
      )}
      {khongDuQuyen && <GoiY>Chỉ lãnh đạo phòng, Ban Giám đốc và Phòng TCTH xem được thống kê sử dụng.</GoiY>}
      {loi && <GoiY>Không tải được thống kê: {loi}</GoiY>}
      {dangTai && !thongKe && <p className="text-center text-sm text-slate-500">Đang tải số liệu…</p>}

      {thongKe && <NoiDungThongKe tk={thongKe} />}
    </div>
  );
}

function NoiDungThongKe({ tk }: { tk: ThongKeFdiHub }) {
  const pgd = tomTatPhongGiaoDich(tk);
  const luotMaxO = Math.max(0, ...tk.theoPhong.flatMap((p) => Object.values(p.theoTab)));
  const tyLePhuChung = tk.tong.soCanBo ? Math.round((tk.tong.nguoi / tk.tong.soCanBo) * 100) : 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OSo nhan="Lượt mở tab" gia={tk.tong.luot} phu={tk.tu ? `${dinhDangNgay(tk.tu)} – ${dinhDangNgay(tk.den)}` : 'từ khi bật ghi nhận'} />
        <OSo nhan="Cán bộ đã dùng" gia={tk.tong.nguoi} phu={`${tyLePhuChung}% trong ${tk.tong.soCanBo} cán bộ`} />
        <OSo nhan="Phòng đã dùng" gia={`${tk.tong.soPhongDung}/${tk.tong.soPhong}`} phu="phòng đang hoạt động" />
        <OSo
          nhan="Phòng giao dịch đã dùng"
          gia={`${pgd.daDung}/${pgd.tong}`}
          phu={pgd.chuaDung.length ? `Chưa dùng: ${pgd.chuaDung.map((t) => t.replace(/^Phòng giao dịch\s*/i, '')).join(', ')}` : 'Tất cả Phòng giao dịch đã mở cẩm nang'}
          nhan_mau={pgd.daDung < pgd.tong ? '#C8102E' : '#1E7B45'}
        />
      </div>

      <The>
        <TieuDeMuc>① Phòng giao dịch — tiếp cận khách hàng FDI</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">
          Tỷ lệ phủ = số cán bộ của phòng đã mở FDI Hub ít nhất một lần trong khoảng đã chọn / số cán bộ đang làm việc của phòng.
        </p>
        <BangPhong phong={tk.phongGiaoDich} />
      </The>

      <The>
        <TieuDeMuc>② Tab nào được dùng nhiều</TieuDeMuc>
        <ul className="space-y-2">
          {tk.theoTab.map((t) => (
            <li key={t.tab} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate font-semibold text-slate-800">{t.nhan}</span>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${t.nhan}: ${t.luot} lượt`}>
                <div className="h-full rounded-full bg-[#0072BC] transition-[width]" style={{ width: `${t.tyLe}%` }} />
              </div>
              <span className="whitespace-nowrap text-xs text-slate-600">
                <b className="text-brand-navy">{t.luot}</b> lượt · {t.nguoi} người
              </span>
            </li>
          ))}
        </ul>
      </The>

      <The>
        <TieuDeMuc>③ Các phòng nghiệp vụ</TieuDeMuc>
        <BangPhong phong={tk.phongKhac} />
      </The>

      <The>
        <TieuDeMuc>④ Ma trận phòng × tab</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Ô càng đậm, phòng mở tab đó càng nhiều (so với ô lớn nhất trong bảng). Số trong ô là lượt.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-bold text-slate-600">Phòng</th>
                {FDI_HUB_TABS.map((t) => (
                  <th key={t.id} className="px-1 py-1 text-center font-bold text-slate-600">
                    <span className="block max-w-[5.5rem] truncate" title={t.nhan}>{t.nhanNgan}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tk.theoPhong.map((p) => (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1 font-semibold text-slate-800">
                    {p.laPhongGiaoDich && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#C8102E]" aria-label="Phòng giao dịch" />}
                    {tenNgan(p.ten)}
                  </td>
                  {FDI_HUB_TABS.map((t) => {
                    const n = p.theoTab[t.id];
                    const muc = mucToO(n, luotMaxO);
                    return (
                      <td key={t.id} className="px-1 py-0.5 text-center">
                        <span
                          className={cn('block rounded-md py-1.5 font-bold tabular-nums', MAU_O[muc])}
                          title={`${p.ten} · ${t.nhan}: ${n} lượt`}
                        >
                          {n || '·'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TieuDePhu className="mt-4">Cách đọc</TieuDePhu>
        <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
          <li>Một lượt = một cán bộ mở một tab; cùng người mở lại cùng tab trong 10 phút không tính thêm.</li>
          <li>Lượt gắn với phòng của cán bộ tại thời điểm mở, nên cán bộ chuyển phòng không làm số cũ đổi.</li>
          <li>Phòng giao dịch chưa có lượt nào vẫn hiện trong bảng — đó chính là phòng cần nhắc.</li>
        </ul>
      </The>
    </>
  );
}

const MAU_O = ['bg-slate-50 text-slate-300', 'bg-sky-100 text-sky-900', 'bg-sky-200 text-sky-950', 'bg-[#4AA3F0] text-white', 'bg-[#00337A] text-white'] as const;

function OSo({ nhan, gia, phu, nhan_mau }: { nhan: string; gia: number | string; phu: string; nhan_mau?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xs font-bold uppercase tracking-wider text-slate-500">{nhan}</div>
      <div className="mt-1 text-3xl font-black tabular-nums text-brand-navy" style={nhan_mau ? { color: nhan_mau } : undefined}>{gia}</div>
      <div className="mt-1 text-xs text-slate-500">{phu}</div>
    </div>
  );
}

function BangPhong({ phong }: { phong: PhongThongKe[] }) {
  if (!phong.length) return <p className="text-sm text-slate-500">Không có phòng nào trong nhóm này.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-brand-navy text-left text-xs text-white">
            <th className="rounded-l-lg px-3 py-2">Phòng</th>
            <th className="px-3 py-2 text-right">Cán bộ</th>
            <th className="px-3 py-2 text-right">Đã dùng</th>
            <th className="px-3 py-2">Tỷ lệ phủ</th>
            <th className="px-3 py-2 text-right">Lượt</th>
            <th className="px-3 py-2">Tab hay dùng</th>
            <th className="rounded-r-lg px-3 py-2">Mở gần nhất</th>
          </tr>
        </thead>
        <tbody>
          {phong.map((p) => {
            const chuaDung = p.luot === 0;
            return (
              <tr key={p.id} className={cn('border-b border-slate-100', chuaDung ? 'bg-red-50/60' : 'even:bg-slate-50/60')}>
                <td className="px-3 py-2 font-semibold text-slate-800">
                  {p.ten}
                  {chuaDung && <Pill className="ml-2 bg-red-100 text-red-800">chưa dùng</Pill>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{p.soCanBo}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-brand-navy">{p.nguoi}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${p.tyLePhu}%`}>
                      <div className={cn('h-full rounded-full', p.tyLePhu >= 50 ? 'bg-[#1E7B45]' : p.tyLePhu > 0 ? 'bg-[#C86400]' : 'bg-slate-300')} style={{ width: `${p.tyLePhu}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-slate-600">{p.tyLePhu}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{p.luot}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{p.tabHayDung ? FDI_HUB_TABS.find((t) => t.id === p.tabHayDung)?.nhan : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-slate-600">{ngayGioNgan(p.xemGanNhat)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function tenNgan(ten: string): string {
  return ten.replace(/^Phòng giao dịch\s*/i, 'PGD ').replace(/^Phòng\s+/i, '');
}

function dinhDangNgay(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
