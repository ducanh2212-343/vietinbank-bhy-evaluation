import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-26-dong-thoi-gian-dau-an-doc-ca-bang-chung-tuan',
  ngay: '2026-08-26',
  loai: 'sua-loi',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Bằng chứng tuần của dấu ấn đã hiện trên dòng thời gian BHY Mark',
  tomTat:
    'Dấu ấn BHY Mark có hai cửa ghi nhịp: nhịp thẻ Kanban (cách cũ) và bằng chứng '
    + 'tuần ở màn Điều hành BGĐ (cách mới, từ 10/08). Dòng thời gian trước đây chỉ '
    + 'đọc cửa cũ, nên ai chuyển sang cách mới thì mạch đứng lại đúng ngày bỏ cách cũ. '
    + 'Nay hai cửa về chung một mạch, không lần ghi nào rơi ra ngoài.',
  diemChinh: [
    'Mỗi mẩu bằng chứng tuần hiện thành một dòng, ghi rõ tuần nào và bồi vào phần STAR nào.',
    'Số đếm cạnh nút «Dòng thời gian & trao đổi» tính cả hai cửa ghi.',
    'Huy hiệu «Chưa cập nhật tuần này» hết báo đỏ oan cho người ghi bằng cửa mới.',
  ],
  duongDan: '/dau-an',
};

export default muc;
