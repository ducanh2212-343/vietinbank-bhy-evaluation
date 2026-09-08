import { Sparkles } from 'lucide-react';
import { CONNECT_SU_MENH } from '@/data/one/connectChuongTrinh';
import { ChomSaoDongTien } from './ChomSaoDongTien';
import { HoaTietMangLuoi } from './HoaTietMangLuoi';

/**
 * Dải mở đầu trang Bắc Hưng Yên Connect: bầu trời đêm đỏ chuyển xanh của logo
 * Connect, chòm sao nối thành đồng tiền VietinBank bên phải, logo Connect và
 * thông điệp bên trái.
 */
export const LOGO_CONNECT = '/brand/connect-logo.webp';

export function ConnectHero({ soHoatDong }: { soHoatDong: number }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl text-white shadow-xl"
      style={{ background: 'linear-gradient(160deg, #C8102E 0%, #7A1E5F 30%, #17357F 62%, #061838 100%)' }}
    >
      <HoaTietMangLuoi className="absolute inset-0 h-full w-full opacity-40" soDinh={40} hat={7} />
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />

      <div className="relative grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-12 lg:items-center lg:py-14">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-4">
            <img
              src={LOGO_CONNECT}
              alt="Logo VietinBank Bắc Hưng Yên Connect"
              width={640}
              height={684}
              className="w-20 drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)] sm:w-24"
            />
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-white/10 px-3.5 py-1 text-2xs font-black uppercase tracking-[0.2em] text-amber-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Bắc Hưng Yên Ways · #2
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
            Bắc Hưng Yên{' '}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              Connect
            </span>
          </h1>
          <p className="mt-2 text-base font-semibold uppercase tracking-wider text-amber-100 sm:text-lg">
            {CONNECT_SU_MENH.khauHieu}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
            {CONNECT_SU_MENH.thongDiep}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-sky-200">
            Kết nối tri thức – Đồng hành chuyển đổi – Kiến tạo giá trị
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#dong-thoi-gian" className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-900 shadow transition hover:bg-amber-200">
              Dòng thời gian kết nối · {soHoatDong} hoạt động
            </a>
            <a href="#cau-truc" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
              Cấu trúc chương trình
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:col-span-5">
          <ChomSaoDongTien className="w-64 sm:w-80 lg:w-full lg:max-w-[380px]" />
        </div>
      </div>
    </section>
  );
}
