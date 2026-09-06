import { OnePageShell } from '@/components/one/OnePageShell';
import { useAuth } from '@/hooks/useAuth';
import { TtcHero, TtcTabsTrungTam } from '@/components/one/training/TrainingNav';
import { TtcQuanTri } from '@/components/one/training/TtcQuanTri';

// Quản trị chương trình — Phòng Tổng hợp tạo, nhân bản, xếp thành viên, soạn
// ngày và đầu việc. Trang tự gác theo vai tcth_admin/system_admin; RLS theo
// bảng thành viên (quan_tri) là hàng rào thật cho từng chương trình.
export default function OneTrainingQuanTriPage() {
  const { roles } = useAuth();
  const laTcth = roles.includes('tcth_admin') || roles.includes('system_admin');
  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <TtcHero title="Quản trị chương trình">
          Tạo chương trình mới hoặc nhân bản từ mẫu, xếp thành viên và vai, soạn ngày và đầu việc —
          không cần đội phát triển.
        </TtcHero>
        <TtcTabsTrungTam laTcth={laTcth} />
        <TtcQuanTri />
      </section>
    </OnePageShell>
  );
}
