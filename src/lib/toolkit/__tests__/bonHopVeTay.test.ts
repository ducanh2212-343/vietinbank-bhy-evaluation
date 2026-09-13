import { describe, it, expect } from 'vitest';
import { MAU_BON_HOP, apMau, chuyenThe, docBonHop, suaThe, taoBonHop, theTrongO, themThe, xoaThe } from '../bonHop';
import { DO_DAY_BUT, MAU_BUT, boNetCuoi, docVeTay, rutGonDiem, taiDiem, taoVeTay, themNet, xoaHet } from '../veTay';
import { TOOLKIT_DU_LIEU_TOI_DA, kichThuocJson } from '../index';

describe('mô hình 4 hộp', () => {
  it('có mẫu ngày 5 đúng bốn nhóm của Bảng việc và mẫu trống để tự đặt', () => {
    const m = MAU_BON_HOP.find((x) => x.ma === 'TU_LAM_GIAO_VIEC')!;
    expect(m.o.map((o) => o.ten)).toEqual(['Tự làm', 'Giao việc kèm chuẩn', 'Tạm dừng', 'Tự động hoá']);
    expect(MAU_BON_HOP.some((x) => x.ma === 'TRONG')).toBe(true);
  });
  it('Eisenhower: khẩn + quan trọng là ô phải trên = Làm ngay', () => {
    const d = taoBonHop('EISENHOWER');
    expect(d.o[1].ten).toBe('Làm ngay');
    expect(d.truc_x.cao).toBe('Khẩn cấp');
    expect(d.truc_y.cao).toBe('Quan trọng');
  });
  it('thẻ mới vào khay chưa xếp, rồi kéo vào ô, sửa, xoá', () => {
    let { d, id } = themThe(taoBonHop(), 'Duyệt hồ sơ ABC');
    expect(theTrongO(d, null).map((t) => t.id)).toEqual([id]);
    d = chuyenThe(d, id, 1);
    expect(theTrongO(d, 1)).toHaveLength(1);
    expect(theTrongO(d, null)).toHaveLength(0);
    d = suaThe(d, id, 'Duyệt hồ sơ XYZ');
    expect(d.the[0].van_ban).toBe('Duyệt hồ sơ XYZ');
    expect(xoaThe(d, id).the).toHaveLength(0);
  });
  it('áp mẫu khác đổi trục và tên ô nhưng GIỮ thẻ và vị trí — đổi khung không mất việc đã ghi', () => {
    let { d } = themThe(taoBonHop('EISENHOWER'), 'việc', 3);
    d = apMau(d, 'SWOT');
    expect(d.o[0].ten).toBe('Điểm mạnh');
    expect(d.the[0].o).toBe(3);
  });
  it('đọc jsonb hỏng: thiếu trục lấy mặc định, thẻ không có chữ bị bỏ, ô sai về khay', () => {
    const d = docBonHop({ the: [{ van_ban: 'a', o: 7 }, { o: 1 }, 'rác', { id: 'k', van_ban: 'b', o: 2, mau: '#ff0000' }] });
    expect(d.truc_x.ten).toBe('Khẩn cấp');
    expect(d.the).toHaveLength(2);
    expect(d.the[0].o).toBeNull();
    expect(d.the[1]).toMatchObject({ id: 'k', o: 2, mau: '#ff0000' });
    expect(docBonHop(null).o).toHaveLength(4);
  });
});

describe('bảng vẽ tay', () => {
  it('khổ mặc định 16:10, chưa có nét', () => {
    const d = taoVeTay();
    expect(d.rong / d.cao).toBeCloseTo(1.6);
    expect(d.net).toEqual([]);
  });
  it('thêm nét, bỏ nét cuối (hoàn tác), xoá hết', () => {
    let d = themNet(taoVeTay(), { mau: MAU_BUT[1], do_day: DO_DAY_BUT[0], diem: [0, 0, 0.5, 10, 10, 0.5] });
    d = themNet(d, { mau: MAU_BUT[2], do_day: DO_DAY_BUT[2], tay: true, diem: [5, 5, 1, 6, 6, 1] });
    expect(d.net).toHaveLength(2);
    expect(d.net[1].tay).toBe(true);
    expect(boNetCuoi(d).net).toHaveLength(1);
    expect(xoaHet(d).net).toHaveLength(0);
  });
  it('đọc jsonb: nét thiếu điểm bị bỏ, điểm lẻ bị cắt về bội 3, màu và độ dày sai về mặc định', () => {
    const d = docVeTay({ rong: 99999, net: [
      { diem: [1, 2] },
      { mau: 'xanh', do_day: 999, diem: [0, 0, 1, 1, 1, 1, 7] },
    ] });
    expect(d.rong).toBe(1600);
    expect(d.net).toHaveLength(1);
    expect(d.net[0].diem).toEqual([0, 0, 1, 1, 1, 1]);
    expect(d.net[0].mau).toBe(MAU_BUT[0]);
    expect(d.net[0].do_day).toBe(DO_DAY_BUT[1]);
  });
  it('rút gọn điểm sát nhau nhưng luôn giữ điểm đầu và điểm cuối', () => {
    const diem = [0, 0, 1, 0.5, 0.5, 1, 1, 1, 1, 30, 30, 1, 30.2, 30.2, 1];
    const ra = rutGonDiem(diem, 5);
    expect(ra.slice(0, 3)).toEqual([0, 0, 1]);
    expect(ra.slice(-3)).toEqual([30.2, 30.2, 1]);
    expect(ra.length).toBeLessThan(diem.length);
  });
  it('tải điểm phẳng thành bộ ba cho perfect-freehand', () => {
    expect(taiDiem([1, 2, 0.5, 3, 4, 0.7, 9])).toEqual([[1, 2, 0.5], [3, 4, 0.7]]);
  });
});

describe('trần dữ liệu', () => {
  it('đo đúng byte UTF-8 và trần trùng máy chủ', () => {
    expect(kichThuocJson({ a: 'ă' })).toBe(new TextEncoder().encode('{"a":"ă"}').length);
    expect(TOOLKIT_DU_LIEU_TOI_DA).toBe(524288);
  });
});
