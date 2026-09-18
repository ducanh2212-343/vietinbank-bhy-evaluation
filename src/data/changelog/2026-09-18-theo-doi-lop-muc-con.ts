import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-18-theo-doi-lop-muc-con',
  ngay: '2026-09-18',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  // Một câu nói rõ CÁN BỘ ĐƯỢC GÌ (≤ 80 ký tự). Không nói tên bảng, tên hàm.
  tieuDe: 'Training Center: tích từng mục, màn Theo dõi lớp, bảng điểm danh cả đợt',
  // 1–3 câu: dùng để làm gì, thay cho cách làm cũ nào.
  tomTat: 'Mỗi đầu việc chia được thành các mục nhỏ (điểm dừng, sản phẩm phải nộp, tiêu chí kiểm thử) — học viên tích từng mục, dán link ngay tại mục; team đào tạo có màn «Theo dõi lớp» nhìn cả lớp một lượt và bấm xác nhận, thay cho hỏi từng bàn. Phòng Tổng hợp bật/tắt mô-đun theo từng chương trình, lớp ngắn không còn tab thừa.',
  // 1–5 gạch đầu dòng — điểm chính của lần cập nhật này.
  diemChinh: [
    'Học viên tích từng mục của đầu việc; đủ mục bắt buộc thì đầu việc tự hoàn thành, mục sản phẩm dán link / nộp tệp ngay tại chỗ, mục kiểm thử ghi Đạt / Chưa kèm lý do.',
    'Tab «Theo dõi lớp» cho team đào tạo: lưới học viên × từng mục, ba màu chưa / tự tích / đã xác nhận, bấm một ô là xác nhận hoặc tích hộ, tự làm tươi 30 giây.',
    'Vai mới «Trợ giảng»: xem cả lớp và xác nhận tiến độ, không chấm điểm, không sửa nội dung, không đọc tự soi.',
    'Đầu việc cấu hình thêm: người dẫn tích cho cả lớp (giờ thực tế), lời dẫn chỉ team thấy, tên người dẫn, mẫu ghi chú có nhãn để học viên trả lời theo ô.',
    'Điểm danh có bảng tổng hợp cả đợt: học viên × ngày, ✓ đúng giờ, +phút muộn, ✕ vắng, tổng theo người và theo ngày, tải CSV; chương trình bật/tắt được Tự soi, Bảng việc, Bloom, Lịch BGĐ, Toolkit.',
  ],
  duongDan: '/one/training-center',
  // duongDan: '/duong-dan-mo-thang-tinh-nang',
  // danhCho: ['system_admin', 'tcth_admin', 'bgd'],  // bỏ trống = mọi cán bộ
  // pr: 0,
};

export default muc;
