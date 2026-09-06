import { TtcKhung } from '@/components/one/training/TrainingNav';
import { TtcLoTrinh } from '@/components/one/training/TtcLoTrinh';

// Bắc Hưng Yên Training Center — màn «Lộ trình». Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingLoTrinhPage() {
  return (
    <TtcKhung
      title="Lộ trình"
      moTa="Dải ngày, lịch chi tiết theo giờ, ô tích hoàn thành từng đầu việc và xem trước ngày mai. Học viên tự tích — Ban Giám đốc nhìn thấy ngay, không phải hỏi."
    >
      {(bc) => <TtcLoTrinh bc={bc} />}
    </TtcKhung>
  );
}
