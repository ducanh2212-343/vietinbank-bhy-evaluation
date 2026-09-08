import { OnePageShell } from '@/components/one/OnePageShell';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { ConnectPillar } from '@/components/one/programs/ConnectPillar';
import { ConnectHero } from '@/components/one/connect/ConnectHero';
import { ThuMoiChamAI } from '@/components/one/connect/ThuMoiChamAI';
import { BaiVietConnect, locBaiConnect } from '@/components/one/connect/BaiVietConnect';
import { HoaTietMangLuoi } from '@/components/one/connect/HoaTietMangLuoi';
import { useOneUploads } from '@/components/one/useOneUploads';

/**
 * Bắc Hưng Yên Connect — một trong sáu thương hiệu của Bắc Hưng Yên Ways.
 *
 * Năm thương hiệu còn lại đều dẫn thẳng tới công cụ thật (Sharing → kho tri thức,
 * Quizzi, Ideas, Sao Xứng Đáng, Credit 360). Riêng Connect là chuỗi hội nghị và
 * hoạt động kết nối, không có màn hình nghiệp vụ, nên đây chính là trang của nó.
 *
 * Bố cục từ trên xuống: nhận diện (logo + lưới vàng kim) → thư mời diễn đàn
 * Chạm AI 26/08/2026 → bài viết chuyên mục Connect lấy sống từ kho tư liệu →
 * phần giới thiệu chương trình (con số hội nghị Thu 2024) vốn có từ trước.
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
  const { items } = useOneUploads();
  // Ảnh bìa của bài Chạm AI trong kho tư liệu chính là thư mời in — dùng lại,
  // không lưu thêm bản thứ hai.
  const baiChamAI = locBaiConnect(items).find((it) => /chạm ai/i.test(it.title));

  return (
    <div className="relative">
      <HoaTietMangLuoi
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] w-full opacity-[0.12]"
        mau="#0057B8"
        hat={2024}
        soDinh={60}
      />
      <section className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <ConnectHero />
        <ThuMoiChamAI anhThuMoi={baiChamAI?.imageUrl} />
        <BaiVietConnect />
        <div className="rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <ConnectPillar
            images={pillarImages.connect || []}
            onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('connect', index, fileOrUrl)}
          />
        </div>
      </section>
    </div>
  );
}
