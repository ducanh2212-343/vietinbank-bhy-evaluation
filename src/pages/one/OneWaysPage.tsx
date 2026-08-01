import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarTabs } from '@/components/one/programs/PillarTabs';
import { useOneUploads } from '@/components/one/useOneUploads';
import { BHY_WAYS, BHY_WAYS_DINH_NGHIA } from '@/data/one/bhyWays';

// BẮC HƯNG YÊN WAYS — hệ sinh thái các phương thức quản trị và phát triển Chi nhánh.
// Trang này CHỈ giới thiệu; mỗi thương hiệu có công cụ đều dẫn sang nơi làm việc thật
// (nguyên tắc «một chức năng một cửa» của sơ đồ site đã duyệt).
export default function OneWaysPage() {
  return (
    <OnePageShell>
      <NoiDung />
    </OnePageShell>
  );
}

function NoiDung() {
  const navigate = useNavigate();
  const { items } = useOneUploads();

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 via-white to-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-4 py-1.5 text-2xs font-semibold uppercase tracking-widest text-white">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Hệ sinh thái quản trị
          </span>

          <h1 className="mt-5 text-4xl font-bold uppercase tracking-tight text-brand-navy sm:text-5xl">
            Bắc Hưng Yên Ways
          </h1>
          <p className="mt-3 text-lg font-medium text-brand-red">
            Hệ sinh thái các phương thức quản trị và phát triển Chi nhánh
          </p>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-600">
            <EditableText
              id="ways.dinh_nghia"
              defaultVal={BHY_WAYS_DINH_NGHIA}
              multiline
              as="span"
            />
          </p>

          {/* Năm mục tiêu rút ra từ chính câu định nghĩa — giúp người đọc nắm nhanh */}
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {['Phát triển tri thức', 'Thúc đẩy sáng kiến', 'Tăng cường kết nối', 'Kiểm soát rủi ro', 'Ghi nhận xứng đáng'].map((m) => (
              <li
                key={m}
                className="rounded-full border border-brand-navy/15 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy shadow-sm"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {BHY_WAYS.map((w) => (
            <article
              key={w.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-normal hover:shadow-lg"
              style={{ ['--way' as string]: w.accent }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `${w.accent}1A`, color: w.accent }}
                >
                  <w.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-brand-navy">{w.ten}</h2>
                  <p className="truncate text-2xs font-semibold uppercase tracking-wider" style={{ color: w.accent }}>
                    {w.dinhVi}
                  </p>
                </div>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-slate-600">{w.moTa}</p>

              {w.duongDan ? (
                <Link
                  to={w.duongDan}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy transition-colors hover:text-brand-royal"
                >
                  {w.nhanNut ?? 'Vào hệ thống'}
                  <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" />
                </Link>
              ) : (
                // Thương hiệu chưa có công cụ riêng — nói thẳng thay vì dựng nút dẫn đi đâu cả
                <p className="mt-4 text-2xs font-medium uppercase tracking-wider text-slate-400">
                  Hoạt động thường niên · chưa có công cụ trực tuyến riêng
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Tìm hiểu sâu từng đặc trưng — giữ nguyên nội dung và thư viện ảnh do
          quản trị viên sửa tại chỗ (bảng portal_images, slot 'pillar.*'). */}
      <section className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-navy">
            Tìm hiểu sâu từng đặc trưng
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Cách làm, hình ảnh hoạt động thực tế và kết quả của từng phương thức tại Chi nhánh.
          </p>
        </div>
        <PillarTabs
          onOpenUploadModal={() => navigate('/one/hoc-hoi?action=chia-se')}
          uploadedItems={items}
        />
      </section>
    </>
  );
}
