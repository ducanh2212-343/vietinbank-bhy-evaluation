import { TtcKhung } from '@/components/one/training/TrainingNav';
import { TtcLichBgd } from '@/components/one/training/TtcLichBgd';

// Bắc Hưng Yên Training Center — màn «Lịch Ban Giám đốc». Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingLichBgdPage() {
  return (
    <TtcKhung
      title="Lịch Ban Giám đốc"
      moTa="Mọi khung giờ cần Giám đốc hoặc PGĐ có mặt, gom theo ngày, có tổng phút mỗi ngày và tổng giờ cả đợt."
    >
      {(bc) => <TtcLichBgd bc={bc} />}
    </TtcKhung>
  );
}
