import { OnePageShell } from '@/components/one/OnePageShell';
import { ConnectHero } from '@/components/one/connect/ConnectHero';
import { CauTrucChuongTrinh } from '@/components/one/connect/CauTrucChuongTrinh';
import { DongThoiGianConnect } from '@/components/one/connect/DongThoiGianConnect';
import { BaiVietConnect } from '@/components/one/connect/BaiVietConnect';
import { HoaTietMangLuoi } from '@/components/one/connect/HoaTietMangLuoi';
import { useConnectDongThoiGian } from '@/components/one/connect/useConnectDongThoiGian';

/**
 * Bắc Hưng Yên Connect — một trong sáu thương hiệu của Bắc Hưng Yên Ways.
 *
 * Năm thương hiệu còn lại đều dẫn thẳng tới công cụ thật (Sharing → kho tri thức,
 * Quizzi, Ideas, Sao Xứng Đáng, Credit 360). Riêng Connect là chuỗi hội nghị và
 * hoạt động kết nối, nên đây là trang của nó — và từ 09/2026 có một thứ ghi
 * được: dòng thời gian kết nối do Phòng KHDN / TCTH tự bồi thêm.
 *
 * Bố cục: chòm sao đồng tiền (nhận diện) → cấu trúc chương trình (phần ổn định,
 * từ Onepage và Thư ngỏ) → dòng thời gian (phần sống: hội nghị, diễn đàn, kết
 * nối; thư mời Chạm AI chỉ là một dòng trong đó) → thư viện bài viết Connect.
 */
export default function OneConnectPage() {
  return (
    <OnePageShell>
      <NoiDung />
    </OnePageShell>
  );
}

function NoiDung() {
  const { hoatDong } = useConnectDongThoiGian();
  return (
    <div className="relative">
      <HoaTietMangLuoi
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] w-full opacity-[0.12]"
        mau="#0057B8"
        hat={2024}
        soDinh={60}
      />
      <section className="mx-auto w-full max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        <ConnectHero soHoatDong={hoatDong.length} />
        <CauTrucChuongTrinh />
        <DongThoiGianConnect />
        <BaiVietConnect />
      </section>
    </div>
  );
}
