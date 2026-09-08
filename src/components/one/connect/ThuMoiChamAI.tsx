import { Clock, Cpu, Handshake, MapPin, Target, Users } from 'lucide-react';
import { THU_MOI_CHAM_AI } from '@/data/one/connectThuMoi';
import { HoaTietMangLuoi } from './HoaTietMangLuoi';

/**
 * Thư mời «Chạm AI, Chạm tương lai» dựng lại theo thư mời in (nền xanh đêm,
 * tiêu đề trắng – xanh – đỏ, timeline dọc). Chữ đặt thẳng trong trang để đọc
 * được trên điện thoại và tìm kiếm được; ảnh thư mời gốc nằm trong bài viết
 * ở phần «Từ kho tư liệu» ngay dưới.
 */
const ICON_GIA_TRI = [Users, Target, Handshake];

export function ThuMoiChamAI({ anhThuMoi }: { anhThuMoi?: string }) {
  const tm = THU_MOI_CHAM_AI;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#061838] text-white shadow-xl">
      <HoaTietMangLuoi className="absolute inset-0 h-full w-full opacity-40" mau="#7FB7FF" hat={2026} soDinh={38} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(70% 60% at 80% 20%, rgba(30,136,229,0.35), transparent 70%)' }}
      />

      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-2xs font-black uppercase tracking-[0.2em] text-sky-200">
            <Cpu className="h-3.5 w-3.5" />
            Thư mời · Bắc Hưng Yên Connect
          </span>
          <h2 className="mt-4 text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-4xl">
            Chạm <span className="text-sky-400">AI</span>,
            <br />
            Chạm tương <span className="text-red-500">lai</span>
          </h2>
          <p className="mt-3 inline-block rounded-md border border-white/25 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/90">
            {tm.phuDe}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-sky-200">
            {tm.khauHieu.join(' – ')}
          </p>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
              <div>
                <dt className="text-2xs font-black uppercase tracking-wider text-white/60">Thời gian</dt>
                <dd className="font-bold">
                  {tm.gio} · <span className="text-sky-300">{tm.ngay}</span>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
              <div>
                <dt className="text-2xs font-black uppercase tracking-wider text-white/60">Địa điểm</dt>
                <dd className="font-bold leading-snug">{tm.diaDiem}</dd>
              </div>
            </div>
          </dl>

          {anhThuMoi && (
            <a
              href={anhThuMoi}
              target="_blank"
              rel="noreferrer"
              className="mt-6 block overflow-hidden rounded-2xl border border-white/15 shadow-lg"
            >
              <img src={anhThuMoi} alt="Ảnh thư mời tham dự diễn đàn Chạm AI, Chạm tương lai" className="w-full" loading="lazy" />
            </a>
          )}
        </div>

        <div className="lg:col-span-7">
          <h3 className="mb-4 inline-block rounded-full border border-sky-300/40 px-4 py-1 text-xs font-black uppercase tracking-[0.2em] text-sky-100">
            Timeline chương trình
          </h3>
          <ol className="relative ml-2 space-y-3 border-l border-sky-300/40 pl-5">
            {tm.timeline.map((m) => (
              <li key={m.gio} className="relative text-sm">
                <span
                  className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#061838] ${
                    m.nhan === 'TIỆC TỐI' ? 'bg-amber-300' : 'bg-sky-300'
                  }`}
                />
                <span className="mr-2 font-mono text-xs font-bold text-sky-300">{m.gio}</span>
                {m.nhan && (
                  <span className={`mr-1.5 font-black uppercase ${m.nhan === 'TIỆC TỐI' ? 'text-amber-300' : 'text-sky-200'}`}>
                    {m.nhan} –
                  </span>
                )}
                <span className={m.nhan === 'TIỆC TỐI' ? 'font-black uppercase text-amber-300' : 'text-white/90'}>
                  {m.noiDung}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {tm.giaTri.map((g, i) => {
              const Icon = ICON_GIA_TRI[i];
              return (
                <div key={g.ten} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <Icon className="mb-1.5 h-5 w-5 text-sky-300" />
                  <p className="text-xs font-black uppercase tracking-wide">{g.ten}</p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-white/70">{g.moTa}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
