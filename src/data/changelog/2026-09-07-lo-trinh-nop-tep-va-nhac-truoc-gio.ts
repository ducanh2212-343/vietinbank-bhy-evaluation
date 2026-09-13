import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-lo-trinh-nop-tep-va-nhac-truoc-gio',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Training Center: sửa lộ trình tại chỗ, nộp tệp đính kèm, nhắc trước giờ',
  tomTat:
    'Ban Giám đốc và Phòng Tổng hợp sửa được lộ trình chi tiết ngay trên màn Lộ trình (thêm, sửa, xoá ngày và đầu ' +
    'việc) thay vì sang màn Quản trị. Mỗi đầu việc bật được tính năng nộp tệp đính kèm, ghi chú kết quả hoặc đường ' +
    'dẫn; bật rồi thì học viên nộp ngay trên dòng đó và phải nộp mới tích hoàn thành được. Trước giờ bắt đầu của ' +
    'ngày và trước giờ kết thúc từng phần, hệ thống tự kiểm tra lại và push cho những người mà lần đào tạo này chọn.',
  diemChinh: [
    'Nút «Sửa ngày», «Thêm đầu việc», bút sửa và thùng rác ngay trên Lộ trình — quyền như màn Quản trị',
    'Đầu việc nộp lên Training Center có ô «Nộp tệp đính kèm» (PDF, Word, Excel, PowerPoint, ảnh, tối đa 20 MB)',
    'Chưa nộp thì chưa tích hoàn thành được; Ban Giám đốc mở tệp học viên đã nộp ngay trên dòng đầu việc',
    'Mục «Nhắc trước giờ — báo cho ai»: bật/tắt, chọn số phút và chọn đích danh người nhận trong từng lần đào tạo',
    'Dòng «Nhắc trong ngày» trên Lộ trình nói trước hôm nay sẽ push lúc mấy giờ; bấm push mở đúng Lộ trình đang chạy',
  ],
  duongDan: '/one/training-center',
};

export default muc;
