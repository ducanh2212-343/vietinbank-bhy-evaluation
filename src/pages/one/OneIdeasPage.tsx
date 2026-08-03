import { OnePageShell } from '@/components/one/OnePageShell';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { IdeasPillar } from '@/components/one/programs/IdeasPillar';

// Nơi làm việc thật của BHY Ideas (menu Sáng kiến & Nghiệp vụ).
// Trang đặc trưng ở Nguồn cội chỉ giới thiệu và dẫn về đây.
export default function OneIdeasPage() {
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  return (
    <OnePageShell>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <IdeasPillar
          images={pillarImages['ideas'] || []}
          onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('ideas', index, fileOrUrl)}
          onOpenUploadModal={() => {}}
        />
      </section>
    </OnePageShell>
  );
}
