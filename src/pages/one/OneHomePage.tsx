import { Link } from 'react-router-dom';
import {
  Sparkles, Zap, Star, ArrowRight,
  Upload, Lightbulb, ShieldAlert, TreeDeciduous, BookOpen,
} from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { PersonalKanbanMini } from '@/components/kanban/PersonalKanbanMini';
import { useAuth } from '@/hooks/useAuth';
import { useMyFullName } from '@/components/one/useMyFullName';
import { useStarRecords } from '@/components/one/star/useStarRecords';
import { useAdminEditable } from '@/components/one/AdminEditableContext';

// Trang chủ BHY ONE — «ONE của tôi» (việc của tôi trước, thương hiệu sau):
// Kanban cá nhân dùng CHUNG thành phần với trang Tổng quan của phân hệ 343
// (PersonalKanbanMini) để giao diện và quy tắc cảnh báo — quá hạn, chưa cập
// nhật trong tuần — hoàn toàn thống nhất; kèm khối «Tôi được ghi nhận»,
// 5 thao tác nhanh và teaser bản sắc.
// Khối «Tôi cần biết» thuộc giai đoạn 2 (chờ hệ thông báo).

const QUICK_ACTIONS = [
  { to: '/one/hoc-hoi?action=chia-se', icon: Upload, label: 'Chia sẻ kinh nghiệm', color: 'from-blue-500 to-brand-royal' },
  { to: '/quizzi', icon: Zap, label: 'Làm BHY Quizzi', color: 'from-red-500 to-amber-500' },
  { to: '/one/y-tuong', icon: Lightbulb, label: 'Gửi BHY Ideas', color: 'from-amber-500 to-orange-500' },
  { to: '/one/credit-360', icon: ShieldAlert, label: 'Đăng ký Credit 360', color: 'from-emerald-500 to-teal-600' },
  { to: '/one/ghi-nhan', icon: Star, label: 'Gửi Sao Xứng Đáng', color: 'from-amber-400 to-yellow-600' },
];

const TEASER_CARDS = [
  {
    to: '/one/nguon-coi',
    icon: TreeDeciduous,
    title: 'Nguồn cội & Bản sắc',
    desc: 'Cây ký ức, 6 đặc trưng riêng có, Bộ 3 Chiêu thức và câu chuyện văn hóa 20 năm.',
    color: 'from-blue-50 to-white border-blue-200 text-brand-royal',
  },
  {
    to: '/one/hoc-hoi',
    icon: BookOpen,
    title: 'Học hỏi & Chia sẻ',
    desc: 'BHY Sharing, kho tri thức toàn Chi nhánh và luyện nghiệp vụ với Quizzi.',
    color: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
  },
  {
    to: '/one/ghi-nhan',
    icon: Star,
    title: 'Ghi nhận & Lan tỏa',
    desc: 'Sao Xứng Đáng — mọi cán bộ ghi nhận lẫn nhau, tủ quà 500 triệu đồng.',
    color: 'from-amber-50 to-white border-amber-200 text-amber-700',
  },
];

export default function OneHomePage() {
  // Vỏ cổng phải bọc ngoài: AdminEditableProvider nằm trong OnePageShell,
  // nên phần thân dùng useAdminEditable buộc phải là component con.
  return (
    <OnePageShell>
      <HomeContent />
    </OnePageShell>
  );
}

function HomeContent() {
  const { profileId, isGuest } = useAuth();
  const myName = useMyFullName();
  const { siteContent } = useAdminEditable();

  // Sao của tôi: phiếu ghi đúng họ tên (chương trình ghi nhận theo tên cán bộ)
  const { records } = useStarRecords();
  const myRecords = myName
    ? records.filter(r => !r.isCollective && r.name.trim().toLowerCase() === myName.trim().toLowerCase())
    : [];
  const myStars = myRecords.reduce((s, r) => s + r.stars, 0);

  const treeImage = siteContent['culture.tree_image']?.trim() || 'https://i.ibb.co/kV5cgsbp/c-y-k-c.jpg';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">

        {/* Chào mừng */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-navy text-white font-black text-xs uppercase tracking-wider shadow">
            <Sparkles className="w-4 h-4 text-amber-300" />
            VietinBank Bắc Hưng Yên ONE
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-brand-navy uppercase tracking-tight">
            {isGuest ? 'Chào mừng đối tác của Chi nhánh' : myName ? `Chào ${myName}!` : 'Chào mừng bạn!'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isGuest
              ? 'Mời anh/chị khám phá bản sắc văn hóa và các tư liệu Chi nhánh chia sẻ.'
              : 'Nguồn cội → Học hỏi → Hành động → Thói quen → Năng lực và văn hóa → Thành quả.'}
          </p>
        </div>

        {/* ONE CỦA TÔI — Kanban dùng chung thành phần với trang Tổng quan 343
            (giao diện, kéo thả, cảnh báo quá hạn / chưa cập nhật tuần này) */}
        {!isGuest && profileId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2">
              <PersonalKanbanMini profileId={profileId} />
            </div>

            {/* Tôi được ghi nhận */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-300 shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2 font-black text-sm text-amber-700 uppercase pb-3 border-b border-amber-100">
                <Star className="w-4 h-4 fill-amber-500" />
                Tôi được ghi nhận
              </div>
              <div className="flex-1 py-3 text-xs">
                <div className="text-center mb-3">
                  <span className="text-4xl font-black text-amber-600">{myStars}</span>
                  <span className="block text-[11px] font-bold text-slate-500 mt-0.5">Sao Xứng Đáng tích lũy</span>
                </div>
                <div className="space-y-2">
                  {myRecords.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-start gap-2">
                      <span className="shrink-0 inline-flex items-center gap-0.5 font-black text-amber-600">
                        +{r.stars}<Star className="w-3 h-3 fill-amber-500" />
                      </span>
                      <span className="text-slate-600 leading-snug line-clamp-2">{r.reason || 'Ghi nhận thành tích'}</span>
                    </div>
                  ))}
                  {myRecords.length === 0 && (
                    <p className="text-slate-400 text-center">Chưa có phiếu sao ghi tên bạn — hãy tỏa sáng!</p>
                  )}
                </div>
              </div>
              <Link to="/one/ghi-nhan" className="text-xs font-black text-amber-700 hover:underline inline-flex items-center gap-1">
                Xem bảng Sao Xứng Đáng <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* 5 THAO TÁC NHANH — chỉ cán bộ */}
        {!isGuest && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className={`group rounded-2xl bg-gradient-to-br ${color} text-white p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col items-center gap-2 text-center`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-black leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* TEASER BẢN SẮC — rút gọn, dẫn sang Nguồn cội (không lặp nội dung) */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-[#F0F6FA] via-white to-[#FFF8E7] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <img src={treeImage} alt="Cây ký ức" className="w-36 h-36 object-contain shrink-0" referrerPolicy="no-referrer" />
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase">
                Vun Gốc Bền Rễ — Vươn Tầm Tương Lai
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                20 năm một hành trình (2006 – 2026). Khám phá cây ký ức, 6 đặc trưng
                riêng có và những câu chuyện làm nên văn hóa Bắc Hưng Yên.
              </p>
            </div>
            <Link
              to="/one/nguon-coi"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-navy hover:bg-brand-royal text-white font-black text-sm shadow-md transition-all hover:-translate-y-0.5"
            >
              Về Nguồn cội
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEASER_CARDS.filter(c => !isGuest || c.to === '/one/nguon-coi' || c.to === '/one/hoc-hoi').map(({ to, icon: Icon, title, desc, color }) => (
            <Link
              key={to}
              to={to}
              className={`group p-5 rounded-2xl border bg-gradient-to-b ${color} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-2`}
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
  );
}
