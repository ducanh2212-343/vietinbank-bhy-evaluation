import { OnePageShell } from '@/components/one/OnePageShell';
import { StarHero, StarTabs } from '@/components/one/star/StarNav';
import { StarAnalytics } from '@/components/one/star/StarAnalytics';

// Màn BẢNG TỔNG HỢP & THI ĐUA — số liệu nội bộ, mọi cán bộ xem được.
// Nhập file Excel và gỡ phiếu vẫn nằm trong StarAnalytics nhưng chỉ hiện với
// quản trị nội dung (Phòng TCTH), như trước.
export default function OneStarStatsPage() {
  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <StarHero title="Bảng tổng hợp &amp; thi đua">
          Sao tích lũy của từng cán bộ, thi đua giữa các tập thể, điểm KPI và mốc quà quy đổi.
        </StarHero>
        <StarTabs />
        <StarAnalytics />
      </section>
    </OnePageShell>
  );
}
