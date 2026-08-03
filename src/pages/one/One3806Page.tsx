import { Link } from 'react-router-dom';
import { ArrowRight, Award, Layers, ShieldCheck } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Move3FrameworkViewer } from '@/components/one/Move3FrameworkViewer';
import { useAuth } from '@/hooks/useAuth';
import { MOVE3_LEVELS, MOVE3_SKILL_GROUPS, MOVE3_ATTITUDES } from '@/data/one/move3Data';

/**
 * BẮC HƯNG YÊN 3806 — bộ 38 skill và 06 nhóm thái độ.
 *
 * Trang này CHỈ giới thiệu khung năng lực: skill nào, thái độ nào, bốn cấp độ ra
 * sao. Nơi làm việc thật (tự chấm, duyệt phiếu, kế hoạch phát triển) nằm trong
 * phân hệ «Phát triển nhân sự 343» — đúng nguyên tắc «một chức năng một cửa».
 *
 * Nội dung khung dùng lại đúng component đã có (Move3FrameworkViewer) thay vì
 * chép lại — dữ liệu chỉ nằm ở một chỗ là src/data/one/move3Data.ts.
 */
export default function One3806Page() {
  const { isGuest } = useAuth();
  const soSkill = MOVE3_SKILL_GROUPS.reduce((s, g) => s + g.skills.length, 0);

  const soLieu = [
    { icon: Layers, so: soSkill, nhan: 'kỹ năng lõi', phu: `${MOVE3_SKILL_GROUPS.length} nhóm` },
    { icon: ShieldCheck, so: MOVE3_ATTITUDES.length, nhan: 'nhóm thái độ', phu: 'chuẩn hành vi' },
    { icon: Award, so: MOVE3_LEVELS.length, nhan: 'cấp độ', phu: 'Tân binh → Bậc thầy' },
  ];

  return (
    <OnePageShell>
      <section className="border-b border-slate-200 bg-gradient-to-b from-indigo-50 via-white to-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:py-18">
          <span className="inline-block rounded-full bg-brand-navy px-4 py-1.5 text-2xs font-semibold uppercase tracking-widest text-white">
            Khung năng lực Chi nhánh
          </span>

          <h1 className="mt-5 text-4xl font-bold uppercase tracking-tight text-brand-navy sm:text-5xl">
            Bắc Hưng Yên <span className="text-brand-red">3806</span>
          </h1>
          <p className="mt-3 text-lg font-medium text-slate-700">
            {soSkill} kỹ năng lõi &amp; {MOVE3_ATTITUDES.length} nhóm thái độ
          </p>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600">
            Một ngôn ngữ phát triển cán bộ thống nhất cho toàn Chi nhánh: mỗi kỹ năng có mô tả, điểm
            then chốt theo từng cấp độ và gợi ý ứng dụng AI; mỗi nhóm thái độ nêu rõ hành vi nên
            tránh và hành vi kỳ vọng. Đây là nội dung của <strong>Chiêu thức số 3 — Phát triển nhân sự</strong>.
          </p>

          <div className="mx-auto mt-9 grid max-w-2xl gap-4 sm:grid-cols-3">
            {soLieu.map(({ icon: Icon, so, nhan, phu }) => (
              <div key={nhan} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className="mx-auto mb-2 h-5 w-5 text-brand-royal" />
                <p className="text-3xl font-bold tabular-nums text-brand-navy">{so}</p>
                <p className="text-sm font-medium text-slate-700">{nhan}</p>
                <p className="text-2xs text-slate-500">{phu}</p>
              </div>
            ))}
          </div>

          {/* Cửa vào nơi làm việc thật — trang này chỉ giới thiệu */}
          {!isGuest && (
            <Link
              to="/tu-danh-gia"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-fast hover:-translate-y-0.5 hover:bg-brand-royal"
            >
              Vào phiếu tự đánh giá của tôi
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <Move3FrameworkViewer />
      </section>
    </OnePageShell>
  );
}
