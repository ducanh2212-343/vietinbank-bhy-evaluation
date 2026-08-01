import {
  BookOpen, Zap, Lightbulb, Share2, Star, ShieldAlert, type LucideIcon,
} from 'lucide-react';

/**
 * BẮC HƯNG YÊN WAYS — hệ sinh thái các phương thức quản trị của Chi nhánh.
 *
 * Một nguồn dữ liệu duy nhất cho dải thẻ giới thiệu trên Trang chủ và cho nhóm
 * menu "Bắc Hưng Yên Ways". KHÔNG có trang giới thiệu riêng: bấm vào tên nhóm
 * trên thanh menu là bung thẳng 6 thương hiệu, mỗi mục dẫn tới nơi làm việc thật.
 * Dựng thêm một trang giới thiệu nữa chỉ là lặp lại chính Trang chủ.
 *
 * Nguyên tắc «một chức năng một cửa»: `duongDan` luôn trỏ sang nơi làm việc thật.
 * Riêng Connect không có màn hình nghiệp vụ nên có trang nội dung của riêng nó.
 */

export interface WayItem {
  id: string;
  ten: string;
  /** Một câu định vị — trả lời "cái này để làm gì" */
  dinhVi: string;
  moTa: string;
  icon: LucideIcon;
  /** Màu nhận diện, dùng cho viền và nền nhạt của thẻ */
  accent: string;
  /** Nơi làm việc thật; bỏ trống nghĩa là thương hiệu chưa có công cụ riêng */
  duongDan?: string;
  nhanNut?: string;
}

export const BHY_WAYS_DINH_NGHIA =
  'Bắc Hưng Yên Ways là hệ sinh thái các phương thức, công cụ và cơ chế quản trị được ' +
  'VietinBank Bắc Hưng Yên xây dựng, áp dụng và liên tục cải tiến nhằm phát triển tri thức, ' +
  'thúc đẩy sáng kiến, tăng cường kết nối, kiểm soát rủi ro và ghi nhận những đóng góp xứng đáng.';

export const BHY_WAYS: WayItem[] = [
  {
    id: 'sharing',
    ten: 'Bắc Hưng Yên Sharing',
    dinhVi: 'Phát triển tri thức',
    moTa:
      'Sinh hoạt chia sẻ kinh nghiệm nghiệp vụ định kỳ và kho tri thức dùng chung toàn Chi nhánh: ' +
      'case study thực chiến, tài liệu, hình ảnh, video — tra cứu theo phòng ban và chuyên mục.',
    icon: BookOpen,
    accent: '#4AA3F0',
    duongDan: '/one/hoc-hoi',
    nhanNut: 'Vào kho tri thức',
  },
  {
    id: 'quizzi',
    ten: 'Bắc Hưng Yên Quizzi',
    dinhVi: 'Hiểu đúng quy định',
    moTa:
      'Luyện nghiệp vụ bằng trắc nghiệm ngắn theo văn bản và chủ điểm. Có chiến dịch học tập theo ' +
      'đợt, bảng kết quả và vinh danh — biến việc đọc quy định thành thói quen hằng tuần.',
    icon: Zap,
    accent: '#E11D48',
    duongDan: '/quizzi',
    nhanNut: 'Làm Quizzi',
  },
  {
    id: 'ideas',
    ten: 'Bắc Hưng Yên Ideas',
    dinhVi: 'Thúc đẩy sáng kiến',
    moTa:
      'Kênh gửi ý tưởng cải tiến từ mọi vị trí, chấm theo bốn cấp độ Ươm mầm → Bén rễ → Vươn cành ' +
      '→ Lan tỏa, có bình chọn, dự toán thưởng và theo dõi việc áp dụng thực tế.',
    icon: Lightbulb,
    accent: '#F59E0B',
    duongDan: '/one/y-tuong',
    nhanNut: 'Gửi ý tưởng',
  },
  {
    id: 'connect',
    ten: 'Bắc Hưng Yên Connect',
    dinhVi: 'Tăng cường kết nối',
    moTa:
      'Chuỗi hội nghị khách hàng, kết nối hệ sinh thái doanh nghiệp trên địa bàn và gắn kết nội bộ ' +
      'giữa các phòng — nơi quan hệ được xây trước khi giao dịch bắt đầu.',
    icon: Share2,
    accent: '#0057B8',
    duongDan: '/one/bhy-connect',
    nhanNut: 'Tìm hiểu Connect',
  },
  {
    id: 'sao-xung-dang',
    ten: 'Sao Xứng Đáng',
    dinhVi: 'Ghi nhận đóng góp',
    moTa:
      'Mọi cán bộ ghi nhận lẫn nhau bằng phiếu sao — không chờ cấp trên nhận ra. Sao tích lũy quy ' +
      'đổi thành phần thưởng, kèm phân tích theo cá nhân và phòng ban.',
    icon: Star,
    accent: '#FBBF24',
    duongDan: '/one/ghi-nhan',
    nhanNut: 'Gửi Sao Xứng Đáng',
  },
  {
    id: 'credit-360',
    ten: 'Bắc Hưng Yên Credit 360',
    dinhVi: 'Kiểm soát rủi ro',
    moTa:
      'Phiên thẩm định tín dụng đa chiều: hồ sơ được soi từ góc nhìn quan hệ khách hàng, hỗ trợ tín ' +
      'dụng và lãnh đạo phòng kiểm soát, trước khi trình cấp phê duyệt.',
    icon: ShieldAlert,
    accent: '#059669',
    duongDan: '/one/credit-360',
    nhanNut: 'Đăng ký phiên',
  },
];
