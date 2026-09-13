import { OnePageShell } from '@/components/one/OnePageShell';
import { TtcHero, TtcTabsTrungTam } from '@/components/one/training/TrainingNav';
import { TtcDanhMuc } from '@/components/one/training/TtcDanhMuc';
import { useTtcQuyenSoan } from '@/components/one/training/useTrainingCenter';

// TRANG CHỦ Bắc Hưng Yên Training Center — trung tâm nhiều chương trình. Chương
// trình 10 ngày của Trưởng phòng KHDN chỉ là một mục trong danh mục ở đây.
export default function OneTrainingPage() {
  const { laVaoDuoc } = useTtcQuyenSoan();
  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <TtcHero title="Training Center">
          Nơi tổ chức và theo dõi mọi chương trình đào tạo, rèn luyện và phát triển năng lực của Chi nhánh —
          hội nhập cán bộ mới, chuyên đề nâng cấp chuyên môn, chương trình cho cán bộ quy hoạch và duy trì cho
          cán bộ quản lý đương nhiệm.
        </TtcHero>
        <TtcTabsTrungTam soanDuoc={laVaoDuoc} />
        <TtcDanhMuc />
      </section>
    </OnePageShell>
  );
}
