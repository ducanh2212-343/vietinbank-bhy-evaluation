import { useCallback, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CONNECT_SU_MENH } from '@/data/one/connectChuongTrinh';
import { ChomSaoDongTien } from './ChomSaoDongTien';
import { HoaTietMangLuoi } from './HoaTietMangLuoi';

/**
 * Dải mở đầu trang Bắc Hưng Yên Connect: bầu trời đêm đỏ chuyển xanh của logo
 * Connect; bên phải là logo Connect đặt to giữa chòm sao nối thành đồng tiền
 * VietinBank. Rê chuột qua: vòng sao xoay, sao nhấp nháy dồn, cả khối nghiêng
 * theo hướng con trỏ (nghiêng tính bằng JS vì phụ thuộc vị trí chuột; phần
 * xoay/nhấp nháy để CSS lo — xem ChomSaoDongTien).
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
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-white/10 px-3.5 py-1 text-2xs font-black uppercase tracking-[0.2em] text-amber-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Bắc Hưng Yên Ways · #2
          </span>
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

        <div className="flex justify-center lg:col-span-6">
          <LogoGiuaChomSao />
        </div>
      </div>
    </section>
  );
}

/** Logo Connect to, đặt giữa chòm sao đồng tiền; nghiêng theo con trỏ khi rê chuột. */
function LogoGiuaChomSao() {
  const [nghieng, setNghieng] = useState({ x: 0, y: 0 });
  const theoChuot = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const o = e.currentTarget.getBoundingClientRect();
    // -1 … 1 theo hai trục, tối đa nghiêng 9° — đủ thấy «sống» mà không chóng mặt
    const x = ((e.clientX - o.left) / o.width) * 2 - 1;
    const y = ((e.clientY - o.top) / o.height) * 2 - 1;
    setNghieng({ x: -y * 9, y: x * 9 });
  }, []);

  return (
    <div
      className="chom-sao-khung group relative aspect-square w-80 sm:w-[26rem] lg:w-full lg:max-w-[520px]"
      style={{ perspective: '1000px' }}
      onMouseMove={theoChuot}
      onMouseLeave={() => setNghieng({ x: 0, y: 0 })}
    >
      <div
        className="relative h-full w-full transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: `rotateX(${nghieng.x}deg) rotateY(${nghieng.y}deg)`, transformStyle: 'preserve-3d' }}
      >
        <ChomSaoDongTien className="absolute inset-0 h-full w-full" />
        {/* Logo nằm trong lòng đồng tiền, nhô lên một lớp (translateZ) để nghiêng có chiều sâu */}
        <div className="absolute inset-0 grid place-items-center" style={{ transform: 'translateZ(40px)' }}>
          <img
            src={LOGO_CONNECT}
            alt="Logo VietinBank Bắc Hưng Yên Connect"
            width={640}
            height={684}
            className="-mt-[6%] w-[54%] drop-shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>
    </div>
  );
}
