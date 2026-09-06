import { OnePageShell } from '@/components/one/OnePageShell';
import { TtcHero, TtcTabsTrungTam } from '@/components/one/training/TrainingNav';
import { TtcQuanTri } from '@/components/one/training/TtcQuanTri';
import { useTtcQuyenSoan } from '@/components/one/training/useTrainingCenter';

// Quản trị chương trình — Phòng Tổng hợp tạo, nhân bản, xếp thành viên; TCTH
// và Ban Giám đốc của chương trình soạn ngày và đầu việc. Trang tự gác theo
// vai; RLS theo bảng thành viên (quan_tri / bgd) là hàng rào thật.
export default function OneTrainingQuanTriPage() {
  const { laVaoDuoc } = useTtcQuyenSoan();
  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <TtcHero title="Quản trị chương trình">
          Phòng Tổng hợp tạo chương trình mới hoặc nhân bản từ mẫu, xếp thành viên và vai; Ban Giám đốc và
          Phòng Tổng hợp soạn ngày, đầu việc và thông tin chương trình — không cần đội phát triển.
        </TtcHero>
        <TtcTabsTrungTam soanDuoc={laVaoDuoc} />
        <TtcQuanTri />
      </section>
    </OnePageShell>
  );
}
