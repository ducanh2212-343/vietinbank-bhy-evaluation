import { TtcKhungChuongTrinh } from '@/components/one/training/TrainingNav';
import { TtcTuSoi } from '@/components/one/training/TtcTuSoi';

// Bắc Hưng Yên Training Center — màn «Tự soi» của MỘT chương trình
// (/one/training-center/chuong-trinh/:id). Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingTuSoiPage() {
  return (
    <TtcKhungChuongTrinh
      title="Tự soi"
      moTa="Phiếu 08 tiêu chí trưởng thành hai đợt, mô tả hành vi mức 1/3/5, ví dụ thật, biểu đồ dịch chuyển và STOP – START – CONTINUE. Chỉ học viên đọc được nội dung."
    >
      {(bc) => <TtcTuSoi bc={bc} />}
    </TtcKhungChuongTrinh>
  );
}
