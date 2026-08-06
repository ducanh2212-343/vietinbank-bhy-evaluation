/**
 * Màn «Toàn cảnh hồ sơ» phải chịu được dữ liệu THẬT nhập từ board Miro.
 *
 * 47 hồ sơ PDTD của Phòng KHDN vào hệ thống với nhiều ô trống: 16/25 hồ sơ đang
 * chạy không có số tiền, 13/25 không có hạn xử lý, 25/25 chưa ghi nhịp lần nào.
 * Trước đây các trường này là NOT NULL nên giao diện chưa bao giờ gặp null.
 *
 * Hai điều test này giữ:
 *   1. Không vỡ màn — một `new Date(null)` hay `Record[null]` là đủ trắng trang.
 *   2. Ô trống PHẢI hiện thành chữ. Nếu nó hiện «0 triệu» hay bỏ trống lặng lẽ
 *      thì hồ sơ thiếu số tiền trông sạch sẽ y hệt hồ sơ đủ.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Ct2CreditList } from '../Ct2CreditList';
import type { HoSoTinDung } from '@/lib/ct2TinDung';

const CAN_BO = '11111111-1111-1111-1111-111111111111';
const tenNguoi = new Map([[CAN_BO, 'Tôn Thị Thanh Mai']]);

/** Đúng hình dạng một dòng nhập từ Miro: không tiền, không hạn, không kỳ hạn */
const hsTuMiro: HoSoTinDung = {
  id: 'hs-miro', phong: 'p1', ma_hs: 'KHDN-TD-2608-007',
  khach_hang: 'Công ty Nhựa và Khuôn Đông Dương',
  loai_ho_so: 'TAI_CAP', so_tien: null, ky_han: null,
  cap_phe_duyet: 'CHI_NHANH', trang_thai: 'THU_THAP',
  can_bo: CAN_BO, lanh_dao_theo_doi: null, pho_phong: null, truong_phong: null, pgd_phu_trach: null,
  ngay_nhan: null, han_xu_ly: null, ngay_den_han_ghtd: null, ngay_hoan_thanh: null,
  nguoi_dang_giu: null, giu_tu: null, nhip_gan_nhat: null,
  ly_do_tu_choi: null, ghi_chu: 'Nhập từ Miro 08/2026.',
  nguoi_tao: CAN_BO,
  created_at: '2026-08-03T01:00:00Z', updated_at: '2026-08-03T01:00:00Z',
};

describe('Toàn cảnh hồ sơ — dữ liệu nhập từ Miro còn thiếu', () => {
  it('hồ sơ trống hết trường số vẫn hiện được, không vỡ màn', () => {
    render(<Ct2CreditList dsHoSo={[hsTuMiro]} tenNguoi={tenNguoi} onMoHoSo={vi.fn()} />);
    expect(screen.getByText('Công ty Nhựa và Khuôn Đông Dương')).toBeTruthy();
    expect(screen.getByText('Tôn Thị Thanh Mai')).toBeTruthy();
  });

  it('thiếu số tiền hiện thành chữ, KHÔNG hiện «0 triệu»', () => {
    render(<Ct2CreditList dsHoSo={[hsTuMiro]} tenNguoi={tenNguoi} onMoHoSo={vi.fn()} />);
    expect(screen.getAllByText(/chưa có số/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/0 triệu/)).toBeNull();
  });

  it('tổng của cán bộ nói rõ đang thiếu mấy hồ sơ, không im lặng cộng thiếu', () => {
    const coTien = { ...hsTuMiro, id: 'hs-2', khach_hang: 'Công ty Hải Nam', so_tien: 30_000 };
    render(<Ct2CreditList dsHoSo={[hsTuMiro, coTien]} tenNguoi={tenNguoi} onMoHoSo={vi.fn()} />);
    expect(screen.getByText(/thiếu 1 hồ sơ/)).toBeTruthy();
  });

  it('mới nhập hôm nay thì CHƯA đòi cập nhật — đồng hồ bắt đầu từ lúc vào hệ thống', () => {
    // Ngày đầu tiên không được báo đỏ 25 hồ sơ chỉ vì Miro chưa từng có nhịp.
    // Đòi cập nhật ngay hôm nhập là phạt oan, và bảng phạt oan một lần thì lần
    // sau không ai tin nữa.
    render(<Ct2CreditList dsHoSo={[{ ...hsTuMiro, created_at: new Date().toISOString() }]}
      tenNguoi={tenNguoi} onMoHoSo={vi.fn()} />);
    expect(screen.queryByText(/chưa cập nhật/i)).toBeNull();
  });

  it('nhưng để lâu không ghi thì phải hiện «chưa cập nhật lần nào»', () => {
    // Ghim đồng hồ về một ngày SAU triển khai hẳn: im lặng nay kẹp từ ngày
    // triển khai 06/08, nên «để lâu» phải đo so với mốc đó chứ không phải so
    // với ngày nhập. Để đồng hồ thật thì test này đúng/sai tùy hôm chạy.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T02:00:00Z'));
    try {
      const cu = new Date(Date.now() - 30 * 86_400_000).toISOString();
      render(<Ct2CreditList dsHoSo={[{ ...hsTuMiro, created_at: cu }]}
        tenNguoi={tenNguoi} onMoHoSo={vi.fn()} />);
      expect(screen.getAllByText(/chưa cập nhật lần nào/i).length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
