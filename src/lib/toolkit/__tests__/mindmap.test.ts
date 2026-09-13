import { describe, it, expect } from 'vitest';
import {
  MAU_NHANH, chiaHaiBen, demNut, docMindmap, doiCha, doiMau, gapMo, suaVanBan, taoMindmapMoi,
  themAnhEm, themCon, thuTuDoc, timCha, timNut, uocKichThuoc, xepMindmap, xoaNut, type NutMindmap,
} from '../mindmap';

const nut = (id: string, van_ban: string, con: NutMindmap[] = []): NutMindmap => ({ id, van_ban, con });

describe('đọc dữ liệu mindmap từ jsonb', () => {
  it('rỗng hoặc hỏng → sơ đồ mới với tiêu đề mặc định, không nổ', () => {
    expect(docMindmap(null, 'Bài ngày 2').goc.van_ban).toBe('Bài ngày 2');
    expect(docMindmap('rác').goc.con).toEqual([]);
    expect(docMindmap({ goc: 5 }).goc.van_ban).toBe('Ý chính');
  });
  it('giữ cấu trúc hợp lệ, cấp id cho nút thiếu id, bỏ màu không đúng dạng', () => {
    const d = docMindmap({ goc: { van_ban: 'A', mau: 'đỏ', con: [{ id: 'b', van_ban: 'B', mau: '#123456', gap: true, con: [] }] } });
    expect(d.goc.id).toBeTruthy();
    expect(d.goc.mau).toBeUndefined();
    expect(d.goc.con[0]).toMatchObject({ id: 'b', mau: '#123456', gap: true });
  });
  it('cây sâu quá 30 tầng bị cắt để không treo trình duyệt', () => {
    let x: unknown = { van_ban: 'lá', con: [] };
    for (let i = 0; i < 40; i++) x = { van_ban: 'n', con: [x] };
    expect(() => docMindmap({ goc: x })).not.toThrow();
  });
});

describe('thao tác cây — bất biến, trả cây mới', () => {
  const goc = nut('g', 'Gốc', [nut('a', 'A', [nut('a1', 'A1')]), nut('b', 'B')]);

  it('thêm con vào cuối và trả id nút mới; cây cũ không đổi', () => {
    const { goc: moi, id } = themCon(goc, 'a', 'A2');
    expect(timNut(moi, 'a')!.con.map((c) => c.id)).toEqual(['a1', id]);
    expect(timNut(goc, 'a')!.con).toHaveLength(1);
  });
  it('thêm con vào nút đang gập thì tự mở gập — không thì nút mới biến mất', () => {
    const gap = gapMo(goc, 'a');
    expect(timNut(gap, 'a')!.gap).toBe(true);
    const { goc: moi } = themCon(gap, 'a');
    expect(timNut(moi, 'a')!.gap).toBe(false);
  });
  it('thêm anh em chèn ngay sau nút; với gốc thì thành thêm con', () => {
    const { goc: moi, id } = themAnhEm(goc, 'a', 'C');
    expect(moi.con.map((c) => c.id)).toEqual(['a', id, 'b']);
    const { goc: moi2 } = themAnhEm(goc, 'g', 'X');
    expect(moi2.con).toHaveLength(3);
  });
  it('xoá nút kéo theo cả con; gốc không xoá được', () => {
    expect(timNut(xoaNut(goc, 'a'), 'a1')).toBeNull();
    expect(xoaNut(goc, 'g')).toBe(goc);
  });
  it('sửa chữ, đổi màu, bỏ màu', () => {
    expect(timNut(suaVanBan(goc, 'b', 'Bê'), 'b')!.van_ban).toBe('Bê');
    const co = doiMau(goc, 'b', '#abcdef');
    expect(timNut(co, 'b')!.mau).toBe('#abcdef');
    expect(timNut(doiMau(co, 'b', undefined), 'b')!.mau).toBeUndefined();
  });
  it('gập chỉ tác dụng với nút có con', () => {
    expect(timNut(gapMo(goc, 'b'), 'b')!.gap).toBeUndefined();
  });
  it('dời nút sang cha khác; không cho dời vào con cháu của chính nó, không dời gốc', () => {
    const moi = doiCha(goc, 'b', 'a');
    expect(timNut(moi, 'a')!.con.map((c) => c.id)).toEqual(['a1', 'b']);
    expect(moi.con.map((c) => c.id)).toEqual(['a']);
    expect(doiCha(goc, 'a', 'a1')).toBe(goc);
    expect(doiCha(goc, 'g', 'a')).toBe(goc);
  });
  it('tìm cha, thứ tự đọc bỏ qua con của nút gập, đếm nút', () => {
    expect(timCha(goc, 'a1')!.id).toBe('a');
    expect(timCha(goc, 'g')).toBeNull();
    expect(thuTuDoc(goc)).toEqual(['g', 'a', 'a1', 'b']);
    expect(thuTuDoc(gapMo(goc, 'a'))).toEqual(['g', 'a', 'b']);
    expect(demNut(goc)).toBe(4);
  });
});

describe('bố cục tự động', () => {
  it('chia hai bên cân bằng theo chiều cao, nhánh đầu bên phải', () => {
    expect(chiaHaiBen([40, 40, 40, 40])).toEqual(['PHAI', 'TRAI', 'PHAI', 'TRAI']);
    // nhánh đầu rất cao → ba nhánh sau dồn sang trái cho cân
    expect(chiaHaiBen([300, 40, 40, 40])).toEqual(['PHAI', 'TRAI', 'TRAI', 'TRAI']);
  });
  it('gốc ở tâm (0,0); nhánh phải nằm bên phải gốc, nhánh trái bên trái', () => {
    const d = { phien_ban: 1 as const, goc: nut('g', 'Gốc', [nut('a', 'A'), nut('b', 'B')]) };
    const bc = xepMindmap(d);
    const g = bc.nut.find((n) => n.id === 'g')!;
    expect(g.x + g.w / 2).toBeCloseTo(0);
    expect(g.y + g.h / 2).toBeCloseTo(0);
    const a = bc.nut.find((n) => n.id === 'a')!;
    const b = bc.nut.find((n) => n.id === 'b')!;
    expect(a.ben).toBe('PHAI'); expect(a.x).toBeGreaterThan(g.x + g.w);
    expect(b.ben).toBe('TRAI'); expect(b.x + b.w).toBeLessThan(g.x);
  });
  it('mỗi nhánh cấp 1 một màu theo thứ tự, con thừa hưởng, màu tự chọn thắng', () => {
    const d = { phien_ban: 1 as const, goc: nut('g', 'G', [nut('a', 'A', [nut('a1', 'A1')]), { ...nut('b', 'B'), mau: '#000000' }]) };
    const bc = xepMindmap(d);
    const mau = (id: string) => bc.nut.find((n) => n.id === id)!.mau;
    expect(mau('a')).toBe(MAU_NHANH[0]);
    expect(mau('a1')).toBe(MAU_NHANH[0]);
    expect(mau('b')).toBe('#000000');
  });
  it('các nhánh cùng bên không chồng lên nhau theo chiều dọc', () => {
    const d = { phien_ban: 1 as const, goc: nut('g', 'G', Array.from({ length: 6 }, (_, i) => nut(`n${i}`, `Nhánh ${i}`, [nut(`n${i}a`, 'con'), nut(`n${i}b`, 'con')]))) };
    const bc = xepMindmap(d);
    for (const ben of ['PHAI', 'TRAI'] as const) {
      const ds = bc.nut.filter((n) => n.ben === ben && n.capDo === 1).sort((p, q) => p.y - q.y);
      for (let i = 1; i < ds.length; i++) expect(ds[i].y).toBeGreaterThanOrEqual(ds[i - 1].y + ds[i - 1].h);
    }
  });
  it('nút gập không xếp con nhưng vẫn báo số con; đường nối có màu nhánh', () => {
    const d = { phien_ban: 1 as const, goc: nut('g', 'G', [{ ...nut('a', 'A', [nut('a1', 'A1')]), gap: true }]) };
    const bc = xepMindmap(d);
    expect(bc.nut.find((n) => n.id === 'a1')).toBeUndefined();
    expect(bc.nut.find((n) => n.id === 'a')!.soCon).toBe(1);
    expect(bc.duong).toHaveLength(1);
    expect(bc.duong[0].mau).toBe(MAU_NHANH[0]);
    expect(bc.duong[0].d).toMatch(/^M .* C /);
  });
  it('khung bao phủ hết mọi nút', () => {
    const bc = xepMindmap(taoMindmapMoi('Một'));
    expect(bc.khung.w).toBeGreaterThan(0);
    expect(bc.nut.every((n) => n.x >= bc.khung.x && n.x + n.w <= bc.khung.x + bc.khung.w)).toBe(true);
  });
  it('ước lượng kích thước: chữ dài thì xuống dòng thay vì rộng vô hạn', () => {
    const ngan = uocKichThuoc('A', 1);
    const dai = uocKichThuoc('Một câu rất dài để kiểm tra việc xuống dòng của hộp chữ trong sơ đồ tư duy', 1);
    expect(dai.w).toBeLessThanOrEqual(240);
    expect(dai.h).toBeGreaterThan(ngan.h);
  });
});
