import { Calendar, Handshake, Network, Users } from 'lucide-react';
import { HoaTietMangLuoi } from './HoaTietMangLuoi';

/**
 * Dải mở đầu trang Bắc Hưng Yên Connect: nền đỏ chuyển xanh và lưới vàng kim
 * lấy đúng từ bộ nhận diện của logo Connect (tệp thiết kế gốc, 09/2026).
 */
export const LOGO_CONNECT = '/brand/connect-logo.webp';

const DAU_MOC = [
  { icon: Calendar, so: '10/2024', nhan: 'Khởi động chương trình' },
  { icon: Users, so: 'Thu · Xuân', nhan: 'Hội nghị kết nối thường niên' },
  { icon: Handshake, so: '26/08/2026', nhan: 'Diễn đàn Chạm AI, Chạm tương lai' },
];

export function ConnectHero() {
  return (
    <section
      className="relative overflow-hidden rounded-3xl text-white shadow-xl"
      style={{ background: 'linear-gradient(160deg, #E4173B 0%, #8F1F6B 32%, #1F3F8C 62%, #0A2B6B 100%)' }}
    >
      <HoaTietMangLuoi className="absolute inset-0 h-full w-full opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-sky-300/15 blur-3xl" />

      <div className="relative grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-12 lg:items-center lg:py-14">
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-white/10 px-3.5 py-1 text-2xs font-black uppercase tracking-[0.2em] text-amber-200 backdrop-blur">
            <Network className="h-3.5 w-3.5" />
            Bắc Hưng Yên Ways · #2
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
            Bắc Hưng Yên{' '}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              Connect
            </span>
          </h1>
          <p className="mt-3 text-base font-semibold text-amber-100 sm:text-lg">
            Kết nối tri thức – Đồng hành chuyển đổi – Kiến tạo giá trị
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            Hệ sinh thái kết nối khách hàng doanh nghiệp, đối tác và cán bộ Chi nhánh: hội nghị khách
            hàng theo mùa, diễn đàn chia sẻ tri thức và thư viện tư liệu — nơi quan hệ được xây trước
            khi giao dịch bắt đầu.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {DAU_MOC.map(({ icon: Icon, so, nhan }) => (
              <div key={nhan} className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
                <Icon className="mb-1.5 h-4 w-4 text-amber-300" />
                <p className="text-lg font-black tabular-nums leading-tight">{so}</p>
                <p className="mt-0.5 text-2xs font-semibold text-white/75">{nhan}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:col-span-5">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-full bg-amber-200/20 blur-2xl" />
            <img
              src={LOGO_CONNECT}
              alt="Logo VietinBank Bắc Hưng Yên Connect"
              width={640}
              height={684}
              className="relative w-56 drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:w-72"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
