import { TtcKhungChuongTrinh } from '@/components/one/training/TrainingNav';
import { TtcBangViec } from '@/components/one/training/TtcBangViec';

// Bắc Hưng Yên Training Center — màn «Bảng việc» của MỘT chương trình
// (/one/training-center/chuong-trinh/:id). Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingBangViecPage() {
  return (
    <TtcKhungChuongTrinh
      title="Bảng việc"
      moTa="Ba việc gối đầu đủ 5W2H với ô nghiệm thu của Ban Giám đốc, và Kanban 3 cột dùng chung cấu trúc với Chiêu thức 2."
    >
      {(bc) => <TtcBangViec bc={bc} />}
    </TtcKhungChuongTrinh>
  );
}
