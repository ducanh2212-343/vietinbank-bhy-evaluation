import { OnePageShell } from '@/components/one/OnePageShell';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { Credit360Pillar } from '@/components/one/programs/Credit360Pillar';
import { SoDoVanHanh } from '@/components/one/programs/SoDoVanHanh';
import { CREDIT_360_VAN_HANH } from '@/data/one/vanHanhChuongTrinh';

// Trang Bắc Hưng Yên Credit 360: giới thiệu + cách thức vận hành (sơ đồ luồng
// việc, thứ tự phát biểu, biểu mẫu). Sổ nhật ký phiên từng ở đây đã gỡ 09/2026.
export default function OneCreditPage() {
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  return (
    <OnePageShell>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <Credit360Pillar
          images={pillarImages['credit360'] || []}
          onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('credit360', index, fileOrUrl)}
          giuaHaiKhoi={
            <section id="cach-thuc-van-hanh" className="scroll-mt-20">
              <SoDoVanHanh moHinh={CREDIT_360_VAN_HANH} />
            </section>
          }
        />
      </section>
    </OnePageShell>
  );
}
