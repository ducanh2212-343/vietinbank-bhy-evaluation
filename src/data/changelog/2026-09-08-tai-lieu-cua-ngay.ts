import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-08-tai-lieu-cua-ngay',
  ngay: '2026-09-08',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Mỗi ngày học có một bộ tài liệu riêng gửi sẵn cho học viên',
  tomTat:
    'Phòng Tổ chức Tổng hợp và Ban Giám đốc nay đính kèm được bộ biểu mẫu và văn bản cho từng ngày học ngay ' +
    'trên màn Lộ trình. Học viên mở ngày của mình ra là thấy khối «Tài liệu của ngày» ở đầu màn và tải về ' +
    'trực tiếp, không phải chờ gửi qua email hay hỏi lại.',
  diemChinh: [
    'Khối «Tài liệu của ngày» nằm ngay dưới văn bản của ngày, thấy trước cả lịch buổi sáng',
    'Chỉ Phòng Tổ chức Tổng hợp và Ban Giám đốc thêm hoặc bỏ được tài liệu; cả lớp đều tải về được',
    'Mỗi ngày tối đa 10 tệp, mỗi tệp tối đa 20 MB — PDF, Word, Excel, PowerPoint hoặc ảnh',
    'Tài liệu chỉ người trong khóa học mở được, không lộ ra ngoài dù có đường dẫn',
    'Khác với ô nộp tệp trong từng đầu việc: ô đó là bài học viên nộp lên, khối này là tài liệu phát xuống',
  ],
  duongDan: '/one/training-center/lo-trinh',
};

export default muc;
