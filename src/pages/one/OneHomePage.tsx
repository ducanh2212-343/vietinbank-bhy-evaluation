import { Link } from 'react-router-dom';
import {
  Sparkles, Zap, Star, ArrowRight, Upload, Lightbulb, ShieldAlert, Layers, ClipboardList,
} from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { CultureTree } from '@/components/one/CultureTree';
import { PersonalKanbanMini } from '@/components/kanban/PersonalKanbanMini';
import { Ct2HomeStrip } from '@/components/one/move2/Ct2HomeStrip';
import { Ct2DieuHanhBgd } from '@/components/one/move2/Ct2DieuHanhBgd';
import { NewsRail } from '@/components/one/news/NewsRail';
import { useOneUploads } from '@/components/one/useOneUploads';
import { useAuth } from '@/hooks/useAuth';
import { useMyFullName } from '@/components/one/useMyFullName';
import { useMyStars } from '@/components/one/star/useMyStars';
import { useAdminEditable, EditableText } from '@/components/one/AdminEditableContext';
import { BHY_WAYS, BHY_WAYS_DINH_NGHIA } from '@/data/one/bhyWays';
import { BO_3_CHIEU_THUC } from '@/data/one/chieuThuc';
import { MOVE3_ATTITUDES, MOVE3_SKILL_GROUPS } from '@/data/one/move3Data';

// Trang chủ BHY ONE — gộp «ONE của tôi» và «Nguồn cội & Bản sắc» làm một.
//
// Thứ tự có chủ ý: VIỆC CỦA TÔI trước, GIỚI THIỆU sau. Cán bộ vào cổng hằng ngày
// là để làm việc; phần bản sắc và hệ sinh thái đặt bên dưới, chỉ giới thiệu và
// dẫn sang trang riêng — không nhúng form hay dữ liệu (nguyên tắc «một chức năng
// một cửa», docs/so-do-site-bhy-one.md).

const THAO_TAC_NHANH = [
  { to: '/one/chieu-thuc-2', icon: ClipboardList, label: 'Bảng việc & ghi nhịp', color: 'from-brand-navy to-blue-700' },
  { to: '/one/tin-tuc?action=chia-se', icon: Upload, label: 'Chia sẻ kinh nghiệm', color: 'from-blue-500 to-brand-royal' },
  { to: '/quizzi', icon: Zap, label: 'Làm BHY Quizzi', color: 'from-red-500 to-amber-500' },
  { to: '/one/y-tuong', icon: Lightbulb, label: 'Gửi BHY Ideas', color: 'from-amber-500 to-orange-500' },
  { to: '/one/credit-360', icon: ShieldAlert, label: 'Đăng ký Credit 360', color: 'from-emerald-500 to-teal-600' },
  { to: '/one/ghi-nhan', icon: Star, label: 'Gửi Sao Xứng Đáng', color: 'from-amber-400 to-yellow-600' },
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
  // Tin nội bộ dùng chung kho tư liệu; RLS lo phần khách đối tác chỉ thấy tin
  // đã mở, nên ở đây không cần lọc lại theo vai trò
  const { items } = useOneUploads();

  // Sao của tôi: phiếu ghi đúng họ tên VÀ đúng phòng — chi nhánh có cán bộ trùng
  // họ tên (hai chị Nguyễn Thị Phượng, Phòng TCTH và Phòng Ân Thi), lọc theo mỗi
  // tên thì mỗi chị nhìn thấy cả sao của người kia.
  const { myRecords, myStars } = useMyStars();

  const treeImage = siteContent['culture.tree_image']?.trim() || 'https://i.ibb.co/kV5cgsbp/c-y-k-c.jpg';
  const soSkill = MOVE3_SKILL_GROUPS.reduce((s, g) => s + g.skills.length, 0);

  // Khách đối tác chỉ thấy các khu được mở
  const waysChoKhach = ['sharing'];
  const waysHienThi = isGuest ? BHY_WAYS.filter(w => waysChoKhach.includes(w.id)) : BHY_WAYS;

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* 1. VIỆC CỦA TÔI                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-4 py-1.5 text-2xs font-semibold uppercase tracking-widest text-white shadow">
            <Sparkles className="h-4 w-4 text-amber-300" />
            VietinBank Bắc Hưng Yên ONE
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            {isGuest ? 'Chào mừng đối tác của Chi nhánh' : myName ? `Chào ${myName}!` : 'Chào mừng bạn!'}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            {isGuest
              ? 'Mời anh/chị khám phá bản sắc văn hóa và các tư liệu Chi nhánh chia sẻ.'
              : 'Nguồn cội → Học hỏi → Hành động → Thói quen → Năng lực và văn hóa → Thành quả.'}
          </p>
        </div>

        {/* Nhịp sáng của Chiêu thức 2 đứng trên cùng: đây là thứ đổi mỗi ngày
            và có khung giờ cố định, nên phải thấy ngay khi mở cổng, không bắt
            cán bộ nhớ đường vào trang riêng. */}
        {!isGuest && profileId && <Ct2HomeStrip />}

        {/* BGĐ: gộp ba tầng điều hành về một chỗ thay vì bắt đi qua bốn nơi —
            việc đang chờ chính mình · nhịp các phòng phụ trách · dấu ấn tuần này. */}
        {!isGuest && profileId && <Ct2DieuHanhBgd />}

        {!isGuest && profileId && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PersonalKanbanMini profileId={profileId} />
            </div>

            <div className="flex flex-col rounded-2xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-3 text-sm font-bold uppercase text-amber-700">
                <Star className="h-4 w-4 fill-amber-500" />
                Tôi được ghi nhận
              </div>
              <div className="flex-1 py-3 text-xs">
                <div className="mb-3 text-center">
                  <span className="text-4xl font-bold tabular-nums text-amber-600">{myStars}</span>
                  <span className="mt-0.5 block text-2xs font-semibold text-slate-500">Sao Xứng Đáng tích lũy</span>
                </div>
                <div className="space-y-2">
                  {myRecords.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-start gap-2">
                      <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-amber-600">
                        +{r.stars}<Star className="h-3 w-3 fill-amber-500" />
                      </span>
                      <span className="leading-snug text-slate-600 line-clamp-2">{r.reason || 'Ghi nhận thành tích'}</span>
                    </div>
                  ))}
                  {myRecords.length === 0 && (
                    <p className="text-center text-slate-400">Chưa có phiếu sao ghi tên bạn — hãy tỏa sáng!</p>
                  )}
                </div>
              </div>
              <Link to="/one/ghi-nhan" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
                Xem bảng Sao Xứng Đáng <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {!isGuest && (
          <nav
            aria-label="Thao tác nhanh"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {THAO_TAC_NHANH.map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className={`group flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br ${color} p-4 text-center text-white shadow-md transition-all duration-fast hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-semibold leading-tight">{label}</span>
              </Link>
            ))}
          </nav>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. TIN TỨC NỘI BỘ — dải trượt ngang                                 */}
      {/* ------------------------------------------------------------------ */}
      {/* Đứng ngay sau việc của tôi vì đây là phần đổi mới hằng ngày; bản sắc
          và hệ sinh thái bên dưới thì gần như không đổi. Dùng dải trượt ngang
          thay vì lưới dọc để 12 tin chỉ chiếm chiều cao của một thẻ. */}
      <NewsRail items={items} />

      {/* ------------------------------------------------------------------ */}
      {/* 3. BẢN SẮC — 20 năm & Cây ký ức                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-slate-200 bg-gradient-to-r from-[#F0F6FA] via-white to-[#FFF8E7]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
          <img
            src={treeImage}
            alt="Cây ký ức Bắc Hưng Yên"
            width={144}
            height={144}
            loading="lazy"
            decoding="async"
            className="h-36 w-36 shrink-0 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 text-center lg:text-left">
            <p className="text-2xs font-semibold uppercase tracking-widest text-brand-red">2006 — 2026 · 20 năm một hành trình</p>
            <h2 className="mt-1.5 text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl">
              <EditableText id="hero.slogan" defaultVal="Vun Gốc Bền Rễ — Vươn Tầm Tương Lai" />
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <EditableText
                id="home.ban_sac_desc"
                defaultVal="Cây ký ức ghi lại dấu chân của từng thế hệ cán bộ Bắc Hưng Yên. Mỗi vòng gỗ là một năm cùng nhau vun gốc, mỗi tán lá là một thế hệ vươn ra địa bàn."
                multiline
                as="span"
              />
            </p>
          </div>
        </div>
      </section>

      <CultureTree />

      {/* ------------------------------------------------------------------ */}
      {/* 4. BẮC HƯNG YÊN WAYS — chỉ giới thiệu, dẫn sang trang riêng          */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Đây là nơi DUY NHẤT giới thiệu hệ sinh thái. Không dựng thêm trang
            giới thiệu riêng — trên thanh menu, "Bắc Hưng Yên Ways" bấm vào là bung
            thẳng 6 thương hiệu, mỗi mục dẫn tới nơi làm việc thật. */}
        <div className="mb-6 max-w-3xl">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-navy">Bắc Hưng Yên Ways</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            <EditableText id="ways.dinh_nghia" defaultVal={BHY_WAYS_DINH_NGHIA} multiline as="span" />
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {waysHienThi.map((w) => {
            const noiDung = (
              <>
                <span
                  className="mb-3 grid h-10 w-10 place-items-center rounded-xl"
                  style={{ backgroundColor: `${w.accent}1A`, color: w.accent }}
                >
                  <w.icon className="h-5 w-5" />
                </span>
                <span className="block text-sm font-bold text-brand-navy">{w.ten}</span>
                <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-wider" style={{ color: w.accent }}>
                  {w.dinhVi}
                </span>
                <span className="mt-2 block flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">{w.moTa}</span>
              </>
            );
            const lop = 'group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-normal hover:shadow-md';
            return w.duongDan ? (
              <Link key={w.id} to={w.duongDan} className={lop}>
                {noiDung}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy">
                  {w.nhanNut ?? 'Vào hệ thống'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover:translate-x-0.5" />
                </span>
              </Link>
            ) : (
              <div key={w.id} className={lop}>{noiDung}</div>
            );
          })}

          {/* Bắc Hưng Yên 3806 — khung năng lực, đứng cùng hàng với các thương hiệu */}
          {!isGuest && (
            <Link
              to="/one/bhy-3806"
              className="group flex flex-col rounded-2xl border border-brand-navy/25 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm transition-shadow duration-normal hover:shadow-md"
            >
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-navy/10 text-brand-navy">
                <Layers className="h-5 w-5" />
              </span>
              <span className="block text-sm font-bold text-brand-navy">Bắc Hưng Yên 3806</span>
              <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-wider text-brand-royal">
                Khung năng lực Chi nhánh
              </span>
              <span className="mt-2 block flex-1 text-sm leading-relaxed text-slate-600">
                Bộ {soSkill} kỹ năng lõi và {MOVE3_ATTITUDES.length} nhóm thái độ, 4 cấp độ — nội dung
                của Chiêu thức số 3.
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy">
                Tìm hiểu khung 3806
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. BỘ 3 CHIÊU THỨC                                                   */}
      {/* ------------------------------------------------------------------ */}
      {!isGuest && (
        <section className="border-t border-slate-200 bg-slate-50/70">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-navy">Bộ 3 Chiêu thức</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Ba phương thức vận hành cốt lõi: truyền lửa mỗi sáng, chuẩn hóa kế hoạch hành động, và
              phát triển con người theo một khung năng lực chung.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {BO_3_CHIEU_THUC.map((ct) => (
                <article
                  key={ct.so}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                      style={{ backgroundColor: `${ct.accent}1A`, color: ct.accent }}
                    >
                      <ct.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
                        Chiêu thức số {ct.so}
                      </p>
                      <h3 className="truncate text-base font-bold text-brand-navy">{ct.ten}</h3>
                    </div>
                  </div>
                  <p className="text-2xs font-semibold uppercase tracking-wider" style={{ color: ct.accent }}>
                    {ct.dinhVi}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{ct.moTa}</p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                    {ct.duongDan && (
                      <Link
                        to={ct.duongDan}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-navy hover:text-brand-royal"
                      >
                        {ct.nhanNut} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {ct.duongDanLamViec && (
                      <Link
                        to={ct.duongDanLamViec}
                        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-navy"
                      >
                        {ct.nhanNutLamViec} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {!ct.duongDan && (
                      <span className="text-2xs font-medium uppercase tracking-wider text-slate-400">
                        Nếp sinh hoạt hằng ngày · không có màn hình riêng
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
