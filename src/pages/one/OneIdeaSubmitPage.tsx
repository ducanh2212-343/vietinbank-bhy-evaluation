import { OnePageShell } from '@/components/one/OnePageShell';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { IdeasPillar } from '@/components/one/programs/IdeasPillar';
import { IdeaHero, IdeaTabs } from '@/components/one/ideas/IdeaNav';

/**
 * GỬI & TRA CỨU Ý TƯỞNG — nơi làm việc của mọi cán bộ.
 *
 * Tách khỏi trang giới thiệu (/one/y-tuong) theo nguyên tắc «một chức năng một
 * cửa»: trang giới thiệu chỉ giới thiệu và dẫn đường, form với bảng dữ liệu nằm
 * ở đây. Nhờ vậy trang đầu của thương hiệu đọc được trong một màn, còn màn này
 * mở ra là thấy ngay ô nhập chứ không phải cuộn qua phần giới thiệu mỗi lần gửi.
 */
export default function OneIdeaSubmitPage() {
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <IdeaHero title="Gửi &amp; tra cứu ý tưởng">
          Nêu bất cập bạn gặp trong công việc và cách làm mới để xử lý. Tra bảng theo dõi
          trước khi gửi để không trùng ý tưởng phòng khác đã có.
        </IdeaHero>

        <IdeaTabs />

        <IdeasPillar
          images={pillarImages['ideas'] || []}
          onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('ideas', index, fileOrUrl)}
          onOpenUploadModal={() => {}}
        />
      </section>
    </OnePageShell>
  );
}
