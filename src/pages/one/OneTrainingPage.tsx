import { TtcKhung } from '@/components/one/training/TrainingNav';
import { TtcTrangChu } from '@/components/one/training/TtcTrangChu';

// Bắc Hưng Yên Training Center — màn «Trang chủ». Vỏ, hero và tab dùng chung ở
// TrainingNav.tsx; RLS theo bảng thành viên chương trình là hàng rào thật.
export default function OneTrainingPage() {
  return (
    <TtcKhung
      title="Trang chủ"
      moTa="Nơi tổ chức và theo dõi mọi chương trình đào tạo, rèn luyện và phát triển năng lực của Chi nhánh. Chương trình 10 ngày Trưởng phòng KHDN là chương trình đầu tiên chạy ở đây."
    >
      {(bc) => <TtcTrangChu bc={bc} />}
    </TtcKhung>
  );
}
