import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-11-hoi-dong-tim-y-tuong-va-phien-trinh-bay',
  ngay: '2026-09-11',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Hội đồng tìm ngay ý tưởng đang trình bày, thẻ đã chấm đổi màu',
  tomTat:
    'Màn chấm của Hội đồng có ô tìm gộp (mã, tên ý tưởng, người đề xuất, phòng — gõ không dấu '
    + 'vẫn ra) và lọc theo phòng, theo phiên, theo việc mình đã chấm hay chưa. Phòng TCTH xếp '
    + 'ý tưởng thành từng phiên trình bày rồi bấm «Bắt đầu» — màn chấm của cả Hội đồng tự thu '
    + 'về đúng nhóm đang nghe, thay cho một danh sách dọc 20 ý tưởng phải cuộn tìm.',
  diemChinh: [
    'Thẻ đã gửi phiếu viền xanh, đang nháp viền vàng, chưa chấm viền xám — nhìn là biết, không phải cuộn xuống cuối thẻ.',
    'Nút «Gửi phiếu chấm điểm» có nhịp xác nhận 3 giây để khỏi gửi nhầm sang ý tưởng bên cạnh; «Lưu nháp» vẫn bấm một nhịp.',
    'Phòng TCTH mở/kết thúc từng phiên; xếp lại hay xóa phiên không làm mất phiếu ai đã chấm.',
    'Điểm tổng hợp và quorum vẫn tính trên toàn đợt — phiên chỉ để tìm cho nhanh.',
  ],
  duongDan: '/one/y-tuong/hoi-dong',
};

export default muc;
