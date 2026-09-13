import { describe, it, expect } from 'vitest';
import { NHOM_SO_BEN_RE, demTheoNhom, hanhDongSoBenRe, phanLoaiSoBenRe, type DongSoBenRe } from '../ideaSoBenRe';

const d = (mot: Partial<DongSoBenRe>): DongSoBenRe => ({
  trangThai: 'da_ghi_nhan', duyetCn: false, duyetTsc: false, traVeBoi: null, ...mot,
});

describe('Sổ Bén rễ — phân loại theo nguồn công nhận', () => {
  it('20 hồ sơ hiện có do Trụ sở chính đồng ý → «TSC đồng ý»', () => {
    expect(phanLoaiSoBenRe(d({ duyetTsc: true }))).toBe('cong_nhan_tsc');
  });
  it('10 hồ sơ Giám đốc duyệt → «Giám đốc duyệt»', () => {
    expect(phanLoaiSoBenRe(d({ duyetCn: true }))).toBe('cong_nhan_gd');
  });
  it('cả hai cờ cùng bật → nhóm riêng, không đếm hai lần', () => {
    expect(phanLoaiSoBenRe(d({ duyetCn: true, duyetTsc: true }))).toBe('cong_nhan_ca_hai');
  });
  it('trả về tách theo NGƯỜI trả về — yêu cầu 03/09/2026', () => {
    expect(phanLoaiSoBenRe(d({ trangThai: 'tra_ve', traVeBoi: 'tcth' }))).toBe('tcth_tra_ve');
    expect(phanLoaiSoBenRe(d({ trangThai: 'tra_ve', traVeBoi: 'gd' }))).toBe('gd_tra_ve');
  });
  it('các trạng thái luân chuyển còn lại', () => {
    expect(phanLoaiSoBenRe(d({ trangThai: 'cho_gd_duyet' }))).toBe('cho_gd');
    expect(phanLoaiSoBenRe(d({ trangThai: 'da_bo_sung' }))).toBe('da_bo_sung');
    expect(phanLoaiSoBenRe(d({ trangThai: 'tu_choi' }))).toBe('chua_dat');
    expect(phanLoaiSoBenRe(d({ trangThai: 'thu_hoi' }))).toBe('da_rut');
  });
  it('kết luận của TCTH: nuôi dưỡng và dừng ươm mầm là hai nhóm riêng', () => {
    expect(phanLoaiSoBenRe(d({ trangThai: 'nuoi_duong' }))).toBe('nuoi_duong');
    expect(phanLoaiSoBenRe(d({ trangThai: 'dung' }))).toBe('dung');
  });
  it('đếm đủ mọi nhóm kể cả nhóm trống, tổng bằng số dòng', () => {
    const ds = [d({ duyetTsc: true }), d({ duyetTsc: true }), d({ duyetCn: true }), d({ trangThai: 'tra_ve', traVeBoi: 'gd' })];
    const dem = demTheoNhom(ds);
    expect(Object.keys(dem)).toHaveLength(NHOM_SO_BEN_RE.length);
    expect(dem.cong_nhan_tsc).toBe(2);
    expect(dem.cong_nhan_gd).toBe(1);
    expect(dem.gd_tra_ve).toBe(1);
    expect(dem.tcth_tra_ve).toBe(0);
    expect(Object.values(dem).reduce((a, b) => a + b, 0)).toBe(ds.length);
  });
});

describe('Hành động ngay trên sổ — theo vai và trạng thái', () => {
  const GD = { laGiamDoc: true, laQuanTri: false };
  const TCTH = { laGiamDoc: false, laQuanTri: true };

  it('Giám đốc thu hồi được công nhận do mình duyệt, không đụng công nhận của TSC', () => {
    expect(hanhDongSoBenRe(d({ duyetCn: true }), GD)).toContain('thu_hoi_cong_nhan');
    expect(hanhDongSoBenRe(d({ duyetTsc: true }), GD)).not.toContain('thu_hoi_cong_nhan');
    expect(hanhDongSoBenRe(d({ duyetCn: true }), TCTH)).not.toContain('thu_hoi_cong_nhan');
  });

  it('đã lên cấp cao hơn qua Hội đồng thì không thu hồi Bén rễ', () => {
    expect(hanhDongSoBenRe({ ...d({ duyetCn: true }), daLenCapCaoHon: true }, GD)).toEqual([]);
  });

  it('hồ sơ chờ: Giám đốc có đường sang hàng chờ + trả về + rút; TCTH chỉ rút', () => {
    const cho = d({ trangThai: 'cho_gd_duyet' });
    expect(hanhDongSoBenRe(cho, GD)).toEqual(['sang_hang_cho', 'tra_ve', 'rut_ho_so']);
    expect(hanhDongSoBenRe(cho, TCTH)).toEqual(['rut_ho_so']);
  });

  it('chưa đạt: Giám đốc mở lại được; TCTH không sửa hồ sơ đã có quyết định GĐ… nhưng dòng tu_choi TCTH vẫn trả về / nuôi dưỡng được vì CSDL cho', () => {
    expect(hanhDongSoBenRe(d({ trangThai: 'tu_choi', duyetCn: false }), GD)).toEqual(['mo_lai']);
    expect(hanhDongSoBenRe(d({ trangThai: 'tu_choi', duyetCn: false }), TCTH))
      .toEqual(['sang_danh_gia', 'tra_ve', 'nuoi_duong', 'dung']);
  });

  it('đang nuôi dưỡng: TCTH không thấy nút nuôi dưỡng lần nữa, còn trả về và dừng', () => {
    expect(hanhDongSoBenRe(d({ trangThai: 'nuoi_duong', duyetCn: false }), TCTH))
      .toEqual(['sang_danh_gia', 'tra_ve', 'dung']);
  });

  it('công nhận rồi thì TCTH không có nút nào — chỉ Giám đốc thu hồi', () => {
    expect(hanhDongSoBenRe(d({ duyetCn: true }), TCTH)).toEqual([]);
  });
});
