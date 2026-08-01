import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { EditableText } from '@/components/one/AdminEditableContext';
import { WaysTabs } from '@/components/one/programs/WaysTabs';
import { BHY_WAYS_DINH_NGHIA } from '@/data/one/bhyWays';

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

      {/* Sáu thương hiệu — mỗi thương hiệu là một tab con.
          CỐ Ý không lặp lại các thẻ giới thiệu ngắn đã có ở Trang chủ; vào đây là
          để xem chi tiết từng phương thức, không phải đọc lại phần tóm tắt. */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <WaysTabs onOpenUploadModal={() => navigate('/one/hoc-hoi?action=chia-se')} />
      </section>
    </>
  );
}
