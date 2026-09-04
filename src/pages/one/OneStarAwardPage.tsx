import { OnePageShell } from '@/components/one/OnePageShell';
import { StarHero, StarTabs } from '@/components/one/star/StarNav';
import { StarRecognitionForm } from '@/components/one/star/StarRecognitionForm';

// Màn GHI NHẬN SAO — nơi lãnh đạo trao sao.
//
// StarRecognitionForm tự phân vai: Trưởng phòng / PGĐ / BGĐ / TCTH thấy form
// tặng thật; cán bộ khác thấy khối giới thiệu quyền phát sao và cấu trúc ba vế
// để đề xuất với Trưởng phòng.
export default function OneStarAwardPage() {
  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <StarHero title="Ghi nhận Sao">
          Mỗi ngôi sao gắn với một số serial in sẵn — chọn số từ những sao bạn đang giữ,
          hệ thống tự khóa số đó nên không bao giờ trùng.
        </StarHero>
        <StarTabs />
        <StarRecognitionForm />
      </section>
    </OnePageShell>
  );
}
