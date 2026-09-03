import { describe, it, expect } from 'vitest';
import { NHOM_SO_BEN_RE, demTheoNhom, phanLoaiSoBenRe, type DongSoBenRe } from '../ideaSoBenRe';

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
