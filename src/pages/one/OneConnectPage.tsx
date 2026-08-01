import { OnePageShell } from '@/components/one/OnePageShell';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { ConnectPillar } from '@/components/one/programs/ConnectPillar';

/**
 * Bắc Hưng Yên Connect — một trong sáu thương hiệu của Bắc Hưng Yên Ways.
 *
 * Năm thương hiệu còn lại đều dẫn thẳng tới công cụ thật (Sharing → kho tri thức,
 * Quizzi, Ideas, Sao Xứng Đáng, Credit 360). Riêng Connect là chuỗi hội nghị và
 * hoạt động kết nối, không có màn hình nghiệp vụ, nên đây chính là trang của nó.
 */
export default function OneConnectPage() {
  return (
    <OnePageShell>
      <NoiDung />
    </OnePageShell>
  );
}

function NoiDung() {
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <ConnectPillar
        images={pillarImages.connect || []}
        onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('connect', index, fileOrUrl)}
      />
    </section>
  );
}
