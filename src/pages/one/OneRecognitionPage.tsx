import { Star } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { StarWorthy2026 } from '@/components/one/StarWorthy2026';

// Khu Ghi nhận & Lan tỏa — giai đoạn 1 gồm chương trình Sao Xứng Đáng
// («mọi cán bộ ghi nhận lẫn nhau»). Các mục vinh danh khác (Điểm sáng trong ngày,
// Gương mặt tiêu biểu, Câu chuyện tạo giá trị, Góc vinh danh) thuộc giai đoạn 2.
export default function OneRecognitionPage() {
  return (
    <OnePageShell>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 font-black text-xs uppercase tracking-wider">
            <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
            Ghi nhận &amp; Lan tỏa
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-brand-navy uppercase tracking-tight">
            Sao Xứng Đáng
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Mọi cán bộ ghi nhận lẫn nhau — mỗi ngôi sao trao đi là một lời tri ân,
            tích lũy điểm KPI và quy đổi tủ quà tặng của Chi nhánh.
          </p>
        </div>
        <StarWorthy2026 />
      </section>
    </OnePageShell>
  );
}
