import { describe, it, expect } from 'vitest';
import { sapXepTinTuc, tinTrangChu, docNgayVN, nhanThoiGian, locTinTuc } from '../tinTuc';
import { boDau } from '../vietnamese';
import type { UploadedItem } from '@/data/one/types';

function tin(id: string, extra: Partial<UploadedItem> = {}): UploadedItem {
  return {
    id,
    title: `Tin ${id}`,
    category: 'sharing',
    author: 'Nguyễn Văn A',
    department: 'Phòng TCTH',
    date: '1/8/2026',
    summary: 'Tóm tắt',
    tags: [],
    likes: 0,
    ...extra,
  };
}

describe('Sắp xếp tin tức nội bộ', () => {
  it('ghim lên đầu nhưng giữ nguyên thứ tự mới nhất trước của phần còn lại', () => {
    const ds = [tin('a'), tin('b', { isFeatured: true }), tin('c'), tin('d', { isFeatured: true })];
    expect(sapXepTinTuc(ds).map((t) => t.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('không sửa mảng gốc', () => {
    const ds = [tin('a'), tin('b', { isFeatured: true })];
    sapXepTinTuc(ds);
    expect(ds.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('dải Trang chủ cắt đúng số tin, ưu tiên tin ghim dù nằm cuối kho', () => {
    const ds = [...Array(20)].map((_, i) => tin(String(i)));
    ds[19].isFeatured = true;
    const lay = tinTrangChu(ds, 3);
    expect(lay.map((t) => t.id)).toEqual(['19', '0', '1']);
  });
});

describe('Đọc ngày kiểu Việt Nam', () => {
  it('đọc đúng d/m/yyyy chứ không hiểu theo kiểu Mỹ', () => {
    // new Date('3/4/2026') cho ra 4 tháng 3 — mọi ngày ≤ 12 đều lệch tháng
    const d = docNgayVN('3/4/2026')!;
    expect(d.getDate()).toBe(3);
    expect(d.getMonth()).toBe(3); // tháng 4
  });

  it('trả null cho ngày không tồn tại và chuỗi rác', () => {
    expect(docNgayVN('31/2/2026')).toBeNull();
    expect(docNgayVN('hôm nọ')).toBeNull();
    expect(docNgayVN('2026-08-01')).toBeNull();
  });
});

describe('Nhãn thời gian trên thẻ tin', () => {
  const moc = new Date(2026, 7, 10); // 10/8/2026

  it('gọi tên các mốc gần', () => {
    expect(nhanThoiGian('10/8/2026', moc)).toBe('Hôm nay');
    expect(nhanThoiGian('9/8/2026', moc)).toBe('Hôm qua');
    expect(nhanThoiGian('7/8/2026', moc)).toBe('3 ngày trước');
    expect(nhanThoiGian('3/8/2026', moc)).toBe('7 ngày trước');
  });

  it('quá một tuần thì hiện ngày đầy đủ', () => {
    expect(nhanThoiGian('2/8/2026', moc)).toBe('2/8/2026');
  });

  it('so theo NGÀY chứ không theo số giờ chênh lệch', () => {
    // 23h đêm qua so với 1h sáng nay chỉ chênh 2 tiếng nhưng phải là "Hôm qua"
    expect(nhanThoiGian('9/8/2026', new Date(2026, 7, 10, 1))).toBe('Hôm qua');
  });

  it('ngày tương lai hoặc chuỗi lạ thì giữ nguyên, không bịa nhãn', () => {
    expect(nhanThoiGian('20/8/2026', moc)).toBe('20/8/2026');
    expect(nhanThoiGian('sắp tới', moc)).toBe('sắp tới');
  });
});

describe('Lọc tin cho màn hình quản trị', () => {
  const ds = [
    tin('a', { title: 'Chia sẻ kinh nghiệm thẩm định' }),
    tin('b', { title: 'Hội nghị khách hàng', department: 'Phòng KHDN' }),
  ];

  it('gõ không dấu vẫn tìm ra', () => {
    expect(locTinTuc(ds, 'chia se', boDau).map((t) => t.id)).toEqual(['a']);
  });

  it('tìm được cả theo phòng ban', () => {
    expect(locTinTuc(ds, 'KHDN', boDau).map((t) => t.id)).toEqual(['b']);
  });

  it('từ khóa rỗng thì trả nguyên danh sách', () => {
    expect(locTinTuc(ds, '   ', boDau)).toHaveLength(2);
  });
});
