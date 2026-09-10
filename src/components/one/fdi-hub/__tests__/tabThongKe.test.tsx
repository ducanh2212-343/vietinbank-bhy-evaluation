import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { chuanHoaThongKe, type ThongKeTho } from '@/lib/fdiHubThongKe';
import type { KetQuaThongKe } from '../useFdiHubLuotXem';

/**
 * Tab Thống kê dựng từ kết quả hook — giả hook để kiểm ba trạng thái người
 * dùng thật sẽ gặp: chưa áp migration, không đủ quyền, có số liệu (với một
 * Phòng giao dịch chưa dùng phải được gọi tên).
 */

const ketQua: { hienTai: KetQuaThongKe } = {
  hienTai: { thongKe: null, dangTai: false, chuaApMigration: false, khongDuQuyen: false, loi: null, taiLai: vi.fn() },
};

vi.mock('../useFdiHubLuotXem', () => ({
  useFdiHubThongKe: () => ketQua.hienTai,
}));

const { TabThongKe } = await import('../TabThongKe');

const THO: ThongKeTho = {
  tu: '2026-08-12',
  den: '2026-09-10',
  tong: { luot: 25, nguoi: 7, so_phong: 3, so_phong_dung: 2, so_can_bo: 30 },
  theo_tab: [{ tab: 'qua-tang', luot: 15, nguoi: 5 }, { tab: 'hanh-trinh', luot: 10, nguoi: 4 }],
  theo_phong: [
    { id: 'p1', code: 'KHDN', name: 'Phòng KHDN', so_can_bo: 15, luot: 13, nguoi: 4, xem_gan_nhat: '2026-09-10T02:00:00Z', theo_tab: { 'qua-tang': 8, 'hanh-trinh': 5 } },
    { id: 'p2', code: 'PHONG_GIAO_DICH_AN_THI', name: 'Phòng giao dịch Ân Thi', so_can_bo: 8, luot: 12, nguoi: 3, xem_gan_nhat: '2026-09-09T08:00:00Z', theo_tab: { 'qua-tang': 7, 'hanh-trinh': 5 } },
    { id: 'p3', code: 'PHONG_GIAO_DICH_VAN_LAM', name: 'Phòng giao dịch Văn Lâm', so_can_bo: 10, luot: 0, nguoi: 0, xem_gan_nhat: null, theo_tab: {} },
  ],
};

describe('FDI Hub — tab Thống kê sử dụng', () => {
  beforeEach(() => {
    ketQua.hienTai = { thongKe: null, dangTai: false, chuaApMigration: false, khongDuQuyen: false, loi: null, taiLai: vi.fn() };
  });

  it('chưa áp migration thì nói rõ, không vỡ trang', () => {
    ketQua.hienTai.chuaApMigration = true;
    render(<TabThongKe />);
    expect(screen.getByText(/Chưa bật ghi nhận lượt sử dụng/)).toBeInTheDocument();
  });

  it('không đủ quyền thì báo đúng đối tượng được xem', () => {
    ketQua.hienTai.khongDuQuyen = true;
    render(<TabThongKe />);
    expect(screen.getByText(/Chỉ lãnh đạo phòng, Ban Giám đốc và Phòng TCTH/)).toBeInTheDocument();
  });

  it('có số liệu: bốn ô số, Phòng giao dịch chưa dùng được gọi tên, ma trận đủ 9 cột tab', () => {
    ketQua.hienTai.thongKe = chuanHoaThongKe(THO);
    render(<TabThongKe />);
    expect(screen.getByText('Lượt mở tab').nextElementSibling?.textContent).toBe('25');
    expect(screen.getByText('Phòng giao dịch đã dùng').nextElementSibling?.textContent).toBe('1/2');
    expect(screen.getByText(/Chưa dùng: Văn Lâm/)).toBeInTheDocument();
    expect(screen.getAllByText('chưa dùng').length).toBeGreaterThan(0);
    // Ma trận: mỗi phòng một hàng với 9 ô tab
    expect(screen.getByTitle('Phòng giao dịch Ân Thi · Quà tặng: 7 lượt')).toBeInTheDocument();
    expect(screen.getByTitle('Phòng giao dịch Văn Lâm · Checklist: 0 lượt')).toBeInTheDocument();
  });

  it('bộ lọc thời gian có 4 lựa chọn và mặc định 30 ngày', () => {
    ketQua.hienTai.thongKe = chuanHoaThongKe(THO);
    render(<TabThongKe />);
    const nut30 = screen.getByRole('button', { name: '30 ngày qua' });
    expect(nut30).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Từ đầu' })).toHaveAttribute('aria-pressed', 'false');
  });
});
