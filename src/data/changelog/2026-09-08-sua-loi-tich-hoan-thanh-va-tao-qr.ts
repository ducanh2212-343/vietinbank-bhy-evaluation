import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-08-sua-loi-tich-hoan-thanh-va-tao-qr',
  ngay: '2026-09-08',
  loai: 'sua-loi',
  phanHe: 'bhy-ways',
  tieuDe: 'Training Center: tích hoàn thành và tạo mã QR điểm danh đã dùng được',
  tomTat:
    'Hai lỗi chặn học viên và Phòng Tổ chức Tổng hợp dùng Training Center đã được khắc phục. Một là tích ' +
    'hoàn thành đầu việc thì cổng báo lỗi và ô tích không lưu; hai là bấm Tạo QR thì không ra mã. Cả hai ' +
    'nay chạy bình thường, không cần thao tác lại gì.',
  diemChinh: [
    'Học viên tích hoàn thành đầu việc lưu được ngay, cả lớp vẫn nhận tin như thiết kế',
    'Phòng Tổ chức Tổng hợp tạo và in được mã QR cho từng ngày học',
    'Không mất dữ liệu: các lần tích trước đó vốn không lưu được nên không có gì phải nhập lại',
  ],
  duongDan: '/one/training-center/lo-trinh',
};

export default muc;
