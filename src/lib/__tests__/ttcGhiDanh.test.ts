import { describe, it, expect } from 'vitest';
import { chuanHoaMaLop, chuanHoaTen, duongDanGhiDanh, khopDanhSach, locDanhBa, tachDanhSach } from '../ttcGhiDanh';

const danhBa = [
  { id: '1', full_name: 'Trần Đức Anh', email: 'anh.td@vietinbank.vn', employee_code: 'BHY001' },
  { id: '2', full_name: 'Nguyễn Văn Anh' },
  { id: '3', full_name: 'Nguyễn Văn Anh', department_id: 'khdn' },
  { id: '4', full_name: 'Đỗ Việt Anh' },
  { id: '5', full_name: 'Vũ Thị Thu Hà' },
];

describe('chuẩn hoá tên', () => {
  it('bỏ dấu, đ → d, hoa thường, gộp khoảng trắng', () => {
    expect(chuanHoaTen('  Đỗ  Việt   Anh ')).toBe('do viet anh');
    expect(chuanHoaTen('NGUYỄN VĂN ANH')).toBe('nguyen van anh');
  });
  it('mã lớp gõ tay: bỏ cách, hoa, 0 → O, 1 → I, cắt 6 ký tự', () => {
    expect(chuanHoaMaLop(' ab c 01x ')).toBe('ABCOIX');
    expect(chuanHoaMaLop('abcdefgh')).toBe('ABCDEF');
  });
});

describe('tách danh sách dán', () => {
  it('bỏ số thứ tự, lấy ô đầu của dòng Excel, bỏ dòng trống', () => {
    expect(tachDanhSach('1. Trần Đức Anh\n2) Vũ Thị Thu Hà\tPhòng KHDN\n\n- Đỗ Việt Anh, TP\n')).toEqual([
      'Trần Đức Anh', 'Vũ Thị Thu Hà', 'Đỗ Việt Anh',
    ]);
  });
});

describe('khớp danh sách với danh bạ', () => {
  it('khớp tên thiếu dấu, email, mã cán bộ; trùng tên thì đưa ra chọn; không khớp thì báo', () => {
    const kq = khopDanhSach('Tran Duc Anh\nnguyen van anh\nBHY001\nNguyễn Thị Không Có\nDo Viet Anh', danhBa);
    expect(kq.dong[0].khop?.id).toBe('1');
    expect(kq.dong[1].khop).toBeNull();
    expect(kq.dong[1].ungVien.map((u) => u.id)).toEqual(['2', '3']);
    expect(kq.dong[2].daCo).toBe(true); // BHY001 là Trần Đức Anh, dán lần hai → đã tính
    expect(kq.dong[3].khop).toBeNull();
    expect(kq.dong[3].ungVien).toEqual([]);
    expect(kq.dong[4].khop?.id).toBe('4');
    expect(kq.themDuoc).toEqual(['1', '4']);
    expect(kq.soTrungTen).toBe(1);
    expect(kq.soKhongKhop).toBe(1);
  });
  it('người đã trong lớp được đánh dấu «đã có», không đưa vào danh sách thêm', () => {
    const kq = khopDanhSach('Vũ Thị Thu Hà\nĐỗ Việt Anh', danhBa, new Set(['5']));
    expect(kq.dong[0].daCo).toBe(true);
    expect(kq.themDuoc).toEqual(['4']);
    expect(kq.soDaCo).toBe(1);
  });
  it('thiếu họ đệm: «Thu Hà» khớp duy nhất; «Anh» quá ngắn thì không đoán', () => {
    expect(khopDanhSach('Thu Hà', danhBa).themDuoc).toEqual(['5']);
    expect(khopDanhSach('Anh', danhBa).soKhongKhop).toBe(1);
  });
});

describe('tìm kiếm và đường dẫn', () => {
  it('lọc danh bạ theo từ khoá không dấu', () => {
    expect(locDanhBa(danhBa, 'viet anh').map((n) => n.id)).toEqual(['4']);
    expect(locDanhBa(danhBa, '')).toHaveLength(5);
  });
  it('đường dẫn QR ghi danh cùng khuôn ?ma= với điểm danh', () => {
    expect(duongDanGhiDanh('https://one.example', 'AB2C3D')).toBe('https://one.example/one/training-center/ghi-danh?ma=AB2C3D');
  });
});
