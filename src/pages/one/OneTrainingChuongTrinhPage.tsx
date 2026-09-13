import { TtcKhungChuongTrinh } from '@/components/one/training/TrainingNav';
import { TtcTrangChu } from '@/components/one/training/TtcTrangChu';

// Bắc Hưng Yên Training Center — màn «Tổng quan chương trình» của MỘT chương trình
// (/one/training-center/chuong-trinh/:id). Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingChuongTrinhPage() {
  return (
    <TtcKhungChuongTrinh
      title="Tổng quan chương trình"
      moTa="Hôm nay là ngày mấy, tiến độ tới đâu, khung giờ Ban Giám đốc kế tiếp và Kanban hàng ngày của học viên."
    >
      {(bc) => <TtcTrangChu bc={bc} />}
    </TtcKhungChuongTrinh>
  );
}
