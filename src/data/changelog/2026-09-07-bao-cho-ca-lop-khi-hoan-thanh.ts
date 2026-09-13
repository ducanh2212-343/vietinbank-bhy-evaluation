import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-bao-cho-ca-lop-khi-hoan-thanh',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Training Center: bỏ nhắc theo giờ, báo cả lớp khi học viên xong việc',
  tomTat:
    'Trước đây hệ thống nhắc theo giờ trong lộ trình: sắp bắt đầu ngày, sắp hết phần, sắp tới giờ trình bày ' +
    'và 17h còn việc chưa xong. Nay lịch chỉ còn là gợi ý sắp xếp buổi sáng – buổi chiều nên bốn loại nhắc đó ' +
    'đã bỏ hẳn. Thay vào đó, mỗi lần học viên ấn nút hoàn thành một đầu việc, toàn bộ thành viên khóa học ' +
    'nhận ngay một tin kèm con số đã xong bao nhiêu trên tổng số của ngày.',
  diemChinh: [
    'Bỏ toàn bộ nhắc theo giờ — giờ trong lộ trình là gợi ý, không phải cam kết nên nhắc theo nó luôn sai lúc',
    'Học viên ấn «hoàn thành» là cả khóa học biết ngay, tin ghi rõ đầu việc nào và đã xong mấy trên mấy',
    'Mặc định gửi toàn bộ thành viên; muốn thu hẹp thì tích chọn tên trong màn Quản trị',
    'Việc làm bù buổi tối được gộp thành một tin cho mỗi ngày lộ trình, không dội cả chục tin lúc 7h00',
    'Người vừa tích không tự nhận tin của chính mình',
  ],
  duongDan: '/one/training-center/lo-trinh',
};

export default muc;
