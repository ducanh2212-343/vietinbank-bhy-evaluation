import { OnePageShell } from '@/components/one/OnePageShell';
import { StarHero, StarTabs } from '@/components/one/star/StarNav';
import { StarWorthy2026 } from '@/components/one/StarWorthy2026';

// Màn GIỚI THIỆU chương trình Sao Xứng Đáng — cửa vào của khu Ghi nhận & Lan tỏa,
// và là màn duy nhất mở cho khách đối tác (manHinhKhach.ts khớp đường dẫn chính
// xác nên ba đường con tự đóng).
//
// Ô tặng sao, bảng tổng hợp và khu quản lý kho sao đã tách sang màn riêng — xem
// StarNav.tsx. Các mục vinh danh khác (Điểm sáng trong ngày, Gương mặt tiêu biểu,
// Câu chuyện tạo giá trị, Góc vinh danh) thuộc giai đoạn 2.
export default function OneRecognitionPage() {
  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <StarHero title="Sao Xứng Đáng">
          Mọi cán bộ ghi nhận lẫn nhau — mỗi ngôi sao trao đi là một lời tri ân,
          tích lũy điểm KPI và quy đổi tủ quà tặng của Chi nhánh.
        </StarHero>
        <StarTabs />
        <StarWorthy2026 />
      </section>
    </OnePageShell>
  );
}
