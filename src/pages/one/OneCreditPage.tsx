import { OnePageShell } from '@/components/one/OnePageShell';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { Credit360Pillar } from '@/components/one/programs/Credit360Pillar';

// Nơi làm việc thật của BHY Credit 360 (menu Sáng kiến & Nghiệp vụ):
// đăng ký phiên họp + sổ tra cứu. Trang đặc trưng chỉ giới thiệu và dẫn về đây.
export default function OneCreditPage() {
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  return (
    <OnePageShell>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <Credit360Pillar
          images={pillarImages['credit360'] || []}
          onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('credit360', index, fileOrUrl)}
        />
      </section>
    </OnePageShell>
  );
}
