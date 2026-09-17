import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TheDiemPanel } from '../TheDiemPanel';
import type { TongHopTheDiem } from '@/lib/ideaTheDiem';

// Dựng thử màn Thẻ điểm với số liệu thật ngày 17/09/2026 (rút gọn) — khóa
// việc bảng theo phòng và theo cán bộ hiện đúng số ghi nhận, đúng kết luận.

const dem = (um: number, br: number, vc: number, lt = 0) => ({ 'Ươm mầm': um, 'Bén rễ': br, 'Vươn cành': vc, 'Lan tỏa': lt });

const TONG_HOP: TongHopTheDiem = {
  tinhLuc: '2026-09-17T09:00:00Z',
  dangApKpi: false,
  phong: [
    { phongId: 'p1', ma: 'KHDN', ten: 'Phòng KHDN', soCanBo: 15, dem: dem(13, 11, 6) },
    { phongId: 'p2', ma: 'PHONG_GIAO_DICH_VAN_LAM', ten: 'Phòng giao dịch Văn Lâm', soCanBo: 10, dem: dem(25, 8, 0) },
    { phongId: 'p3', ma: 'BL', ten: 'Phòng Bán lẻ', soCanBo: 8, dem: dem(6, 2, 1) },
  ],
  canBo: [
    { profileId: 'a', hoTen: 'Đỗ Việt Anh', phongId: 'p1', maPhong: 'KHDN', tenPhong: 'Phòng KHDN', chucDanh: 'Trưởng phòng KHDN', khoanGon: false, dem: dem(1, 1, 1) },
    { profileId: 'b', hoTen: 'Dương Thị Thanh Thúy', phongId: 'p2', maPhong: 'PHONG_GIAO_DICH_VAN_LAM', tenPhong: 'Phòng giao dịch Văn Lâm', chucDanh: 'Trưởng phòng giao dịch', khoanGon: false, dem: dem(0, 0, 0) },
    { profileId: 'c', hoTen: 'Trần Hà Trang', phongId: 'p3', maPhong: 'BL', tenPhong: 'Phòng Bán lẻ', chucDanh: 'Phó phòng Bán lẻ', khoanGon: false, dem: dem(2, 2, 1) },
  ],
};

vi.mock('../useTongHopTheDiem', () => ({
  useTongHopTheDiem: () => ({ tongHop: TONG_HOP, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../theDiemExcel', () => ({ downloadTheDiemExcel: vi.fn().mockResolvedValue(undefined) }));

describe('TheDiemPanel', () => {
  it('hiện bảng theo phòng với số ghi nhận và điều kiện phòng', () => {
    render(<TheDiemPanel />);
    expect(screen.getByText('Phòng KHDN', { selector: 'td' })).toBeTruthy();
    // KHDN: 13/11/6 → 30 · 11 · 6; quy đổi 23/15 = 153,3%
    expect(screen.getByText('(153.3%)')).toBeTruthy();
    expect(screen.getByText('Đạt · ≥ 2 Vươn cành hoặc ≥ 1 Lan tỏa')).toBeTruthy();
    expect(screen.getByText('Chưa · ≥ 4 Vươn cành hoặc ≥ 2 Lan tỏa')).toBeTruthy();
  });

  it('theo cán bộ: Trưởng phòng KHDN đạt 130%, Trưởng PGD Văn Lâm 0 điểm, Phó phòng Bán lẻ 3/8 không quy đổi', () => {
    render(<TheDiemPanel />);
    expect(screen.getByText('Đạt 130%')).toBeTruthy();
    // Trưởng PGD Văn Lâm: 8/20 = 40%; Phó phòng Bán lẻ: 3/8 = 37,5% — cả hai dưới ngưỡng
    expect(screen.getByText('Chưa đạt · 40%')).toBeTruthy();
    expect(screen.getByText('Chưa đạt · 37.5%')).toBeTruthy();
    expect(screen.getByText(/Bén rễ của phòng, không quy đổi/)).toBeTruthy();
    expect(screen.getByText(/KPI Đổi mới sáng tạo đang/)).toBeTruthy();
  });

  it('lọc theo tên thu hẹp bảng cán bộ', () => {
    render(<TheDiemPanel />);
    fireEvent.change(screen.getByPlaceholderText('Tìm tên / chức danh…'), { target: { value: 'ha trang' } });
    expect(screen.getByText('Trần Hà Trang')).toBeTruthy();
    expect(screen.queryByText('Đỗ Việt Anh')).toBeNull();
    expect(screen.getByText('(1/3)')).toBeTruthy();
  });
});
