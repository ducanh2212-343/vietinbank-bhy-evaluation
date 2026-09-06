import { TtcKhungChuongTrinh } from '@/components/one/training/TrainingNav';
import { TtcLichBgd } from '@/components/one/training/TtcLichBgd';

// Bắc Hưng Yên Training Center — màn «Lịch Ban Giám đốc» của MỘT chương trình
// (/one/training-center/chuong-trinh/:id). Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingLichBgdPage() {
  return (
    <TtcKhungChuongTrinh
      title="Lịch Ban Giám đốc"
      moTa="Mọi khung giờ cần Giám đốc hoặc PGĐ có mặt, gom theo ngày, có tổng phút mỗi ngày và tổng giờ cả đợt."
    >
      {(bc) => <TtcLichBgd bc={bc} />}
    </TtcKhungChuongTrinh>
  );
}
