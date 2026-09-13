import { describe, it, expect } from 'vitest';
import { chuanHoaChuyenMuc, chuanHoaPhongBan, docCauHinhDanhSach } from '../chuyenMuc';

describe('docCauHinhDanhSach — cấu hình chuyên mục/phòng ban lưu dạng JSON', () => {
  it('JSON object → lấy tên hiển thị, không lộ mã và ngoặc kép', () => {
    const raw = '{"sharing":"Bắc Hưng Yên Sharing","connect":"Bắc Hưng Yên Connect & Thư viện"}';
    expect(docCauHinhDanhSach(raw)).toEqual(['Bắc Hưng Yên Sharing', 'Bắc Hưng Yên Connect & Thư viện']);
  });

  it('JSON array → giữ nguyên thứ tự', () => {
    expect(docCauHinhDanhSach('["Phòng TCTH","Phòng KHDN"]')).toEqual(['Phòng TCTH', 'Phòng KHDN']);
  });

  it('chuỗi tách phẩy/xuống dòng kiểu cũ vẫn đọc được', () => {
    expect(docCauHinhDanhSach('A, B\nC')).toEqual(['A', 'B', 'C']);
    expect(docCauHinhDanhSach('  ')).toBeNull();
  });
});

describe('chuanHoaChuyenMuc — bản ghi đã lỡ lưu giá trị hỏng', () => {
  it('mã đúng thì giữ nguyên', () => {
    expect(chuanHoaChuyenMuc('connect')).toBe('connect');
  });

  it('mảnh JSON `"connect":"…"` (bài Chạm AI 09/2026) về đúng mã connect', () => {
    expect(chuanHoaChuyenMuc('"connect":"Bắc Hưng Yên Connect & Thư viện"')).toBe('connect');
    expect(chuanHoaChuyenMuc('"celebration20":"Kỷ niệm 20 Năm VietinBank BHY"')).toBe('celebration20');
  });

  it('tên hiển thị → mã; tên lạ thì trả về tên đã bỏ ngoặc', () => {
    expect(chuanHoaChuyenMuc('Bắc Hưng Yên Sharing')).toBe('sharing');
    expect(chuanHoaChuyenMuc('"Chuyên mục tự đặt"')).toBe('Chuyên mục tự đặt');
  });

  it('phòng ban bỏ ngoặc kép thừa', () => {
    expect(chuanHoaPhongBan('"Phòng KHDN"')).toBe('Phòng KHDN');
    expect(chuanHoaPhongBan(null)).toBe('');
  });
});
