import { TtcKhungChuongTrinh } from '@/components/one/training/TrainingNav';
import { TtcTheoDoiLop } from '@/components/one/training/TtcTheoDoiLop';

// Bắc Hưng Yên Training Center — màn «Theo dõi lớp» của MỘT chương trình
// (/one/training-center/chuong-trinh/:id/theo-doi), chỉ team đào tạo. Vỏ, hero
// và tab dùng chung ở TrainingNav.tsx; RPC xác nhận kiểm vai ở máy chủ.
export default function OneTrainingTheoDoiLopPage() {
  return (
    <TtcKhungChuongTrinh
      title="Theo dõi lớp"
      moTa="Lưới học viên × từng mục của đầu việc trong ngày: ai đã tới đâu, ai đã dán link, kiểm thử đạt hay chưa. Team bấm một ô là xác nhận — hai dấu tách riêng, không ghi đè dấu tự tích của học viên."
    >
      {(bc) => <TtcTheoDoiLop bc={bc} />}
    </TtcKhungChuongTrinh>
  );
}
