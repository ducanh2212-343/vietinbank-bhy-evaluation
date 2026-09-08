import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  CONNECT_CAU_PHAN, CONNECT_DAU_MOI, CONNECT_NGANH_HANG, CONNECT_SU_MENH, CONNECT_THU_NGO,
} from '@/data/one/connectChuongTrinh';

/**
 * Cấu trúc tổng thể chương trình: ba giá trị → bốn cấu phần → mười ngành hàng
 * → cam kết trong Thư ngỏ → đầu mối. Toàn bộ là phần ổn định, đọc từ
 * src/data/one/connectChuongTrinh.ts.
 */
export function CauTrucChuongTrinh() {
  const { isGuest } = useAuth();
  return (
    <section id="cau-truc" className="scroll-mt-24 space-y-8">
      <div className="text-center">
        <span className="inline-block rounded-full bg-brand-navy px-4 py-1.5 text-2xs font-semibold uppercase tracking-widest text-white">
          Cấu trúc chương trình
        </span>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-brand-navy sm:text-3xl">
          Ba giá trị · Bốn cấu phần · Mười ngành hàng
        </h2>
      </div>

      {/* Ba giá trị */}
      <div className="grid gap-4 sm:grid-cols-3">
        {CONNECT_SU_MENH.giaTri.map(({ icon: Icon, ten, moTa }) => (
          <div key={ten} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900 shadow">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-brand-navy">{ten}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{moTa}</p>
          </div>
        ))}
      </div>

      {/* Bốn cấu phần */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CONNECT_CAU_PHAN.map(({ ma, icon: Icon, ten, nhip, moTa }, i) => (
          <div key={ma} className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <span className="absolute right-4 top-3 font-mono text-4xl font-black text-blue-50">0{i + 1}</span>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-navy text-white">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-black text-slate-800">{ten}</h3>
            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-brand-royal">
              {nhip}
            </span>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{moTa}</p>
          </div>
        ))}
      </div>

      {/* Mười ngành hàng — lục giác như Onepage */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-brand-navy">Hệ sinh thái ngành hàng</h3>
            <p className="text-xs text-slate-500">Mười ngành trọng tâm trên địa bàn theo Onepage «VietinBank Connect – Kết nối kinh doanh»</p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CONNECT_NGANH_HANG.map(({ icon: Icon, ten }) => (
            <li key={ten} className="flex flex-col items-center text-center">
              <span
                className="grid h-20 w-20 place-items-center bg-gradient-to-br from-brand-royal to-brand-navy text-white shadow-md"
                style={{ clipPath: 'polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%)' }}
              >
                <Icon className="h-8 w-8" />
              </span>
              <span className="mt-2 text-xs font-bold leading-snug text-slate-700">{ten}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Thư ngỏ: lợi ích & vai trò + đầu mối */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8">
          <h3 className="text-lg font-black uppercase tracking-tight text-brand-navy">Thư ngỏ gửi Quý khách hàng</h3>
          <p className="mt-1 text-xs text-slate-500">
            Chương trình kết nối kinh doanh VietinBank Bắc Hưng Yên Connect — tăng cường liên kết giữa các doanh nghiệp
            mọi ngành nghề, mở rộng thị trường, tối ưu hoá nguồn vốn và nâng cao hiệu suất kinh doanh.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-2xs font-black uppercase tracking-wider text-brand-red">Lợi ích khi tham gia</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {CONNECT_THU_NGO.loiIch.map((l) => (
                  <li key={l} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-2xs font-black uppercase tracking-wider text-brand-royal">Vai trò của VietinBank Bắc Hưng Yên</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {CONNECT_THU_NGO.vaiTro.map((l) => (
                  <li key={l} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-royal" />{l}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-brand-navy">
            Tham gia: {CONNECT_THU_NGO.thamGia}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand-navy to-[#061838] p-6 text-white shadow-md lg:col-span-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-amber-200">Đầu mối chương trình</h3>
          <p className="mt-3 flex items-start gap-2 text-xs text-white/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            VietinBank Bắc Hưng Yên · {CONNECT_DAU_MOI.diaChi}
          </p>
          <ul className="mt-4 space-y-3">
            {CONNECT_DAU_MOI.nguoi.map((n) => (
              <li key={n.email} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xs font-bold uppercase tracking-wider text-white/60">{n.vai}</p>
                <p className="font-black">{n.ten}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/85"><Mail className="h-3.5 w-3.5 text-amber-300" /><a href={`mailto:${n.email}`} className="hover:underline">{n.email}</a></p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85"><Phone className="h-3.5 w-3.5 text-amber-300" /><a href={`tel:${n.dienThoai.replace(/\s/g, '')}`} className="hover:underline">{n.dienThoai}</a></p>
              </li>
            ))}
          </ul>
          {!isGuest && (
            <Link to="/one/hoc-hoi?action=chia-se&chuyen-muc=connect" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:underline">
              Đăng bài vào chuyên mục Connect
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
