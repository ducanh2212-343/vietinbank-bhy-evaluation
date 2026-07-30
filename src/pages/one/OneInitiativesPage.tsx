import { Link } from 'react-router-dom';
import { Lightbulb, ShieldAlert, ArrowRight } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';

// Trang đầu mối nhóm Sáng kiến & Nghiệp vụ — dẫn tới hai hệ thống thật.
const SYSTEMS = [
  {
    to: '/one/y-tuong',
    icon: Lightbulb,
    title: 'BHY Ideas',
    desc: 'Gửi ý tưởng sáng kiến, bình chọn và theo dõi hành trình phát triển Ươm mầm → Lan tỏa. Dự toán thưởng theo cấp độ.',
    color: 'from-amber-50 to-white border-amber-300 text-amber-700',
    cta: 'Gửi ý tưởng ngay',
  },
  {
    to: '/one/credit-360',
    icon: ShieldAlert,
    title: 'BHY Credit 360',
    desc: 'Đăng ký phiên thảo luận nghiệp vụ 360° cho hồ sơ GHTD phức tạp; sổ tra cứu toàn bộ phiên họp của Chi nhánh.',
    color: 'from-emerald-50 to-white border-emerald-300 text-emerald-700',
    cta: 'Đăng ký phiên họp',
  },
];

export default function OneInitiativesPage() {
  return (
    <OnePageShell>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-brand-navy uppercase tracking-tight">
            Sáng kiến &amp; Nghiệp vụ
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Hai hệ thống làm việc thật của Chi nhánh — nơi ý tưởng được nuôi lớn
            và nghiệp vụ được mài sắc qua thảo luận đa chiều.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SYSTEMS.map(({ to, icon: Icon, title, desc, color, cta }) => (
            <Link
              key={to}
              to={to}
              className={`group p-8 rounded-3xl border-2 bg-gradient-to-b ${color} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-3`}
            >
              <Icon className="w-10 h-10" />
              <div className="font-black text-xl text-slate-800">{title}</div>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">{desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-black">
                {cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </OnePageShell>
  );
}
