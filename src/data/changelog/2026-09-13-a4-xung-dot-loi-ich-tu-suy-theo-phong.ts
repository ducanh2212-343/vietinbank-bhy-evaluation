import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-13-a4-xung-dot-loi-ich-tu-suy-theo-phong',
  ngay: '2026-09-13',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Phiếu Hội đồng tự biết bạn có thuộc phòng đề xuất hay không',
  tomTat:
    'Câu A4 của phiếu chấm Hội đồng không hỏi lại nữa: hệ thống đối chiếu phòng của người '
    + 'chấm trong danh bạ với phòng đề xuất ý tưởng rồi tự trả lời. Thành viên chỉ còn khai '
    + 'phần «có phối hợp trực tiếp không» — việc mà danh bạ không biết được.',
  diemChinh: [
    'Cùng phòng đề xuất: hệ thống tự ghi nhận và nói rõ căn cứ, không có ô nào để bấm nhầm.',
    'Khác phòng: bỏ hẳn nhánh «thuộc phòng đề xuất», chỉ còn hai lựa chọn.',
    'Hồ sơ chưa gắn phòng thì vẫn hỏi đủ ba nhánh như cũ.',
    'Phó giám đốc phụ trách khối không tính là thuộc đơn vị đề xuất — chỉ so phòng trên hồ sơ.',
  ],
  duongDan: '/one/y-tuong/hoi-dong',
};

export default muc;
