import { describe, it, expect } from 'vitest';
import { oCsvAnToan, dongCsv } from '../xuatCsv';

/**
 * Tệp .csv kết xuất từ cổng được mở bằng Excel trên máy cán bộ, nên hai rủi ro
 * ở đây đều là rủi ro thật: ô bắt đầu bằng '=' chạy như công thức trên máy
 * người mở, và dấu phân cách nằm trong tên khách hàng làm lệch cột cả dòng.
 * Cả hai đều không có ai báo lỗi lúc chạy — chỉ test mới giữ được.
 */
describe('oCsvAnToan', () => {
  it('vô hiệu hóa ô mở đầu bằng ký tự công thức', () => {
    expect(oCsvAnToan('=1+1')).toBe('"\'=1+1"');
    expect(oCsvAnToan('+84912345678')).toBe('"\'+84912345678"');
    expect(oCsvAnToan("-2+3+cmd|'/C calc'!A0")).toBe("\"'-2+3+cmd|'/C calc'!A0\"");
    expect(oCsvAnToan('@SUM(A1:A9)')).toBe('"\'@SUM(A1:A9)"');
    expect(oCsvAnToan('\t=HYPERLINK("http://x")')).toBe('"\'\t=HYPERLINK(""http://x"")"');
    expect(oCsvAnToan('\r=1+1')).toBe('"\'\r=1+1"');
    expect(oCsvAnToan('\n=1+1')).toBe('"\'\n=1+1"');
  });

  it('không đụng vào ô lành, kể cả khi có ký tự công thức ở GIỮA', () => {
    expect(oCsvAnToan('Công ty TNHH An Phát')).toBe('"Công ty TNHH An Phát"');
    expect(oCsvAnToan('Doanh thu 2026 = 120 tỷ')).toBe('"Doanh thu 2026 = 120 tỷ"');
    expect(oCsvAnToan('a+b')).toBe('"a+b"');
  });

  it('nhân đôi dấu " thay vì đổi nó thành dấu khác', () => {
    // Cách cũ ở màn Kanban đổi " thành ' — sửa luôn dữ liệu gốc của cán bộ.
    expect(oCsvAnToan('Thẻ "ưu tiên" tuần này')).toBe('"Thẻ ""ưu tiên"" tuần này"');
    expect(oCsvAnToan('"')).toBe('""""');
  });

  it('ô rỗng, null, undefined không làm vỡ', () => {
    expect(oCsvAnToan('')).toBe('""');
    expect(oCsvAnToan(null)).toBe('""');
    expect(oCsvAnToan(undefined)).toBe('""');
  });

  it('nhận cả số và giá trị không phải chuỗi', () => {
    expect(oCsvAnToan(0)).toBe('"0"');
    expect(oCsvAnToan(120.5)).toBe('"120.5"');
    expect(oCsvAnToan(false)).toBe('"false"');
  });
});

describe('dongCsv', () => {
  it('dấu phân cách nằm trong giá trị không làm lệch cột', () => {
    const dong = dongCsv(['Nguyễn Văn A', 'KHDN; KHBL', 'Đang làm'], ';');
    expect(dong).toBe('"Nguyễn Văn A";"KHDN; KHBL";"Đang làm"');
    // Cắt thô theo dấu phân cách như cách cũ sẽ ra 4 mảnh; bọc dấu " nên trình
    // đọc CSV vẫn thấy đúng 3 cột.
    expect(dong.split(';').length).toBe(4);
    expect(dongCsv(['A, B', 'C'], ',')).toBe('"A, B","C"');
  });

  it('mặc định dùng dấu chấm phẩy, nhưng nhận dấu phân cách riêng của từng trang', () => {
    expect(dongCsv(['a', 'b'])).toBe('"a";"b"');
    expect(dongCsv(['a', 'b'], ',')).toBe('"a","b"');
  });

  it('dòng trống và ô thiếu vẫn giữ đủ số cột', () => {
    expect(dongCsv([])).toBe('');
    expect(dongCsv([null, undefined, ''], ';')).toBe('"";"";""');
  });

  it('giá trị xuống dòng vẫn nằm gọn trong một ô', () => {
    expect(dongCsv(['Ghi chú\nnhiều dòng', 'x'], ';')).toBe('"Ghi chú\nnhiều dòng";"x"');
  });
});
