import { describe, it, expect } from 'vitest';
import { TTC_TAI_LIEU_TOI_DA, docTaiLieuNgay } from '../trainingCenter';

const tep = (ten: string) => ({ path: `ct/u/n/${ten}`, ten, kich_thuoc: 45056, luc: '2026-09-07T06:00:00Z' });

describe('đọc tài liệu của ngày từ cột jsonb', () => {
  it('cột rỗng hoặc chưa có thì ra danh sách rỗng, không nổ', () => {
    expect(docTaiLieuNgay([])).toEqual([]);
    expect(docTaiLieuNgay(null)).toEqual([]);
    expect(docTaiLieuNgay(undefined)).toEqual([]);
    expect(docTaiLieuNgay('linh tinh')).toEqual([]);
    expect(docTaiLieuNgay({ path: 'a', ten: 'b' })).toEqual([]);
  });
  it('giữ nguyên mục hợp lệ', () => {
    expect(docTaiLieuNgay([tep('BM_NGAY_02.docx')])).toEqual([tep('BM_NGAY_02.docx')]);
  });
  it('bỏ mục thiếu đường dẫn hoặc thiếu tên — bấm vào cũng không mở được', () => {
    const ds = docTaiLieuNgay([
      tep('BM_NGAY_02.docx'),
      { path: '', ten: 'không có đường dẫn', kich_thuoc: 1, luc: '' },
      { path: 'ct/u/n/x.docx', ten: '', kich_thuoc: 1, luc: '' },
      { ten: 'thiếu path', kich_thuoc: 1, luc: '' },
      null,
      'chuỗi',
    ]);
    expect(ds.map((x) => x.ten)).toEqual(['BM_NGAY_02.docx']);
  });
  it('kích thước hỏng hoặc âm về 0, thiếu thời điểm về chuỗi rỗng', () => {
    const [x] = docTaiLieuNgay([{ path: 'a/b/c/d.pdf', ten: 'd.pdf', kich_thuoc: 'to lắm', luc: 123 }]);
    expect(x).toEqual({ path: 'a/b/c/d.pdf', ten: 'd.pdf', kich_thuoc: 0, luc: '' });
    expect(docTaiLieuNgay([{ path: 'a', ten: 'b', kich_thuoc: -5, luc: '' }])[0].kich_thuoc).toBe(0);
  });
  it('trần tệp của giao diện trùng ràng buộc máy chủ', () => {
    expect(TTC_TAI_LIEU_TOI_DA).toBe(10);
  });
});
