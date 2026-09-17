import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TheDiemPanel } from '../TheDiemPanel';
import type { TongHopTheDiem } from '@/lib/ideaTheDiem';

// Dựng thử màn Thẻ điểm với số liệu thật ngày 17/09/2026 (rút gọn) — khóa
// việc bảng theo phòng và theo cán bộ hiện đúng số lũy kế, đúng kết luận.

const dem = (um: number, br: number, vc: number, lt = 0) => ({ 'Ươm mầm': um, 'Bén rễ': br, 'Vươn cành': vc, 'Lan tỏa': lt });

const TONG_HOP: TongHopTheDiem = {
  tinhLuc: '2026-09-17T09:00:00Z',
  dangApKpi: false,
  phong: [
    { phongId: 'p1', ma: 'KHDN', ten: 'Phòng KHDN', soCanBo: 15, dem: dem(13, 11, 6) },
    { phongId: 'p2', ma: 'PHONG_GIAO_DICH_VAN_LAM', ten: 'Phòng giao dịch Văn Lâm', soCanBo: 10, dem: dem(25, 8, 0) },
  ],
  canBo: [
    { profileId: 'a', hoTen: 'Đỗ Việt Anh', phongId: 'p1', maPhong: 'KHDN', tenPhong: 'Phòng KHDN', chucDanh: 'Trưởng phòng KHDN', khoanGon: false, dem: dem(1, 1, 1) },
    { profileId: 'b', hoTen: 'Dương Thị Thanh Thúy', phongId: 'p2', maPhong: 'PHONG_GIAO_DICH_VAN_LAM', tenPhong: 'Phòng giao dịch Văn Lâm', chucDanh: 'Trưởng phòng giao dịch', khoanGon: false, dem: dem(0, 0, 0) },
    { profileId: 'c', hoTen: 'Trần Hà Trang', phongId: 'p1', maPhong: 'KHDN', tenPhong: 'Phòng KHDN', chucDanh: 'Phó phòng Bán lẻ', khoanGon: false, dem: dem(2, 2, 1) },
  ],
};

vi.mock('../useTongHopTheDiem', () => ({
  useTongHopTheDiem: () => ({ tongHop: TONG_HOP, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../theDiemExcel', () => ({ downloadTheDiemExcel: vi.fn().mockResolvedValue(undefined) }));

describe('TheDiemPanel', () => {
  it('hiện bảng theo phòng với số lũy kế và điều kiện phòng', () => {
    render(<TheDiemPanel />);
    expect(screen.getByText('Phòng KHDN', { selector: 'td' })).toBeTruthy();
    // KHDN: 13/11/6 → lũy kế 30 · 17 · 6; quy đổi 23/15 = 153,3%
    expect(screen.getByText('(153.3%)')).toBeTruthy();
    expect(screen.getByText('Đạt · ≥ 2 Vươn cành hoặc ≥ 1 Lan tỏa')).toBeTruthy();
    expect(screen.getByText('Chưa · ≥ 4 Vươn cành hoặc ≥ 2 Lan tỏa')).toBeTruthy();
  });

  it('theo cán bộ: Trưởng phòng KHDN đạt 130%, Trưởng PGD Văn Lâm chưa đạt, Phó phòng tạm tính như Trưởng phòng', () => {
    render(<TheDiemPanel />);
    // Trưởng phòng KHDN và Phó phòng (tạm tính như Trưởng phòng, cùng số liệu phòng) đều 130%
    expect(screen.getAllByText('Đạt 130%')).toHaveLength(2);
    expect(screen.getAllByText('Chưa đạt').length).toBeGreaterThan(0);
    // Dòng của Phó phòng ghi rõ đang tạm tính như Trưởng phòng (ô ghi chú cuối màn cũng nhắc)
    expect(screen.getAllByText(/tạm tính như Trưởng phòng/).length).toBeGreaterThanOrEqual(2);
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
