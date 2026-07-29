import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Zap, Camera, FolderOpen, ArrowRight } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Hero } from '@/components/one/Hero';
import { CultureTree } from '@/components/one/CultureTree';
import { ContactSection } from '@/components/one/ContactSection';

// Card dẫn tới các khu vực của cổng — thay cho cuộn trang dài của bản gốc
const SECTION_CARDS = [
  {
    to: '/one/dac-trung',
    icon: Sparkles,
    title: '6 Đặc trưng Riêng có',
    desc: 'Công nghệ số & AI, BHY Connect, Sharing, Quizzi, Ideas, Credit 360.',
    color: 'from-blue-50 to-white border-blue-200 text-brand-navy',
  },
  {
    to: '/one/chieu-thuc',
    icon: Zap,
    title: 'Bộ 3 Chiêu thức & Sao Xứng Đáng',
    desc: 'Năng lượng ngày mới, KHHĐ 5W2H, Phát triển nhân sự 38 Skill & 4 Sao.',
    color: 'from-amber-50 to-white border-amber-200 text-amber-700',
  },
  {
    to: '/one/khung-hinh',
    icon: Camera,
    title: 'Tạo Ảnh 20 Năm',
    desc: 'Khung ảnh đại diện & thiệp chúc mừng kỷ niệm 20 năm thành lập.',
    color: 'from-red-50 to-white border-red-200 text-brand-red',
  },
  {
    to: '/one/kho-du-lieu',
    icon: FolderOpen,
    title: 'Kho Dữ Liệu',
    desc: 'Tư liệu, hình ảnh hoạt động và sản phẩm của các chương trình.',
    color: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
  },
];

export default function OneOverviewPage() {
  const navigate = useNavigate();

  return (
    <OnePageShell>
      <Hero
        onExplorePrograms={() => navigate('/one/dac-trung')}
        onExploreMoves={() => navigate('/one/chieu-thuc')}
        onOpenAvatar={() => navigate('/one/khung-hinh')}
      />

      <CultureTree onOpenAvatar={() => navigate('/one/khung-hinh')} />

      {/* Điều hướng nhanh tới các khu vực */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTION_CARDS.map(({ to, icon: Icon, title, desc, color }) => (
            <Link
              key={to}
              to={to}
              className={`group p-5 rounded-2xl border bg-gradient-to-b ${color} shadow-sm hover:shadow-lift hover:-translate-y-0.5 transition-all flex flex-col gap-2`}
            >
              <Icon className="w-7 h-7" />
              <div className="font-extrabold text-sm text-slate-800">{title}</div>
              <p className="text-xs text-slate-500 leading-relaxed flex-1">{desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity">
                Khám phá <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ContactSection />
    </OnePageShell>
  );
}
