import { describe, expect, it } from 'vitest';
import {
  chuanHoaThongKe,
  laPhongGiaoDich,
  mucToO,
  tinhKhoang,
  tomTatPhongGiaoDich,
  type ThongKeTho,
} from '../fdiHubThongKe';
import { FDI_HUB_TABS } from '@/data/one/fdiHub';

const THO: ThongKeTho = {
  tu: '2026-08-12',
  den: '2026-09-10',
  tong: { luot: 42, nguoi: 12, so_phong: 4, so_phong_dung: 2, so_can_bo: 100 },
  theo_tab: [
    { tab: 'hanh-trinh', luot: 20, nguoi: 10 },
    { tab: 'qua-tang', luot: 10, nguoi: 6 },
    { tab: 'tab-la', luot: 99, nguoi: 99 },
  ],
  theo_phong: [
    { id: 'p1', code: 'KHDN', name: 'Phòng KHDN', so_can_bo: 15, luot: 30, nguoi: 9, xem_gan_nhat: '2026-09-10T02:00:00Z', theo_tab: { 'hanh-trinh': 18, 'qua-tang': 12 } },
    { id: 'p2', code: 'PHONG_GIAO_DICH_AN_THI', name: 'Phòng giao dịch Ân Thi', so_can_bo: 8, luot: 12, nguoi: 3, xem_gan_nhat: '2026-09-09T08:00:00Z', theo_tab: { 'hanh-trinh': 2, 'qua-tang': 10 } },
    { id: 'p3', code: 'PHONG_GIAO_DICH_VAN_LAM', name: 'Phòng giao dịch Văn Lâm', so_can_bo: 10, luot: 0, nguoi: 0, xem_gan_nhat: null, theo_tab: {} },
    { id: 'p4', code: 'BL', name: 'Phòng Bán lẻ', so_can_bo: 0, luot: 0, nguoi: 0, xem_gan_nhat: null, theo_tab: null },
  ],
};

describe('Thống kê FDI Hub — nhận diện Phòng giao dịch', () => {
  it('nhận theo mã PHONG_GIAO_DICH_* hoặc PGD*, hoặc theo tên có «giao dịch»', () => {
    expect(laPhongGiaoDich({ code: 'PHONG_GIAO_DICH_OCEAN CITY', name: 'x' })).toBe(true);
    expect(laPhongGiaoDich({ code: 'PGD_YM', name: 'x' })).toBe(true);
    expect(laPhongGiaoDich({ code: 'XYZ', name: 'Phòng giao dịch Yên Mỹ' })).toBe(true);
    expect(laPhongGiaoDich({ code: 'XYZ', name: 'Phong giao dich Yen My' })).toBe(true);
    expect(laPhongGiaoDich({ code: 'DVKH', name: 'Phòng Dịch vụ khách hàng' })).toBe(false);
    expect(laPhongGiaoDich({ code: 'KHDN', name: 'Phòng KHDN' })).toBe(false);
  });
});

describe('Thống kê FDI Hub — chuẩn hoá số liệu thô', () => {
  const tk = chuanHoaThongKe(THO);

  it('đủ 9 tab theo đúng thứ tự cẩm nang, tab chưa có lượt = 0, bỏ tab lạ', () => {
    expect(tk.theoTab.map((t) => t.tab)).toEqual(FDI_HUB_TABS.map((t) => t.id));
    expect(tk.theoTab.find((t) => t.tab === 'hanh-trinh')).toMatchObject({ luot: 20, nguoi: 10, tyLe: 100 });
    expect(tk.theoTab.find((t) => t.tab === 'qua-tang')?.tyLe).toBe(50);
    expect(tk.theoTab.find((t) => t.tab === 'checklist')).toMatchObject({ luot: 0, nguoi: 0, tyLe: 0 });
  });

  it('Phòng giao dịch xếp trước, kể cả phòng chưa dùng; phòng nghiệp vụ xếp sau', () => {
    expect(tk.theoPhong.map((p) => p.code)).toEqual(['PHONG_GIAO_DICH_AN_THI', 'PHONG_GIAO_DICH_VAN_LAM', 'KHDN', 'BL']);
    expect(tk.phongGiaoDich).toHaveLength(2);
    expect(tk.phongKhac).toHaveLength(2);
  });

  it('tính tỷ lệ phủ = người đã dùng / cán bộ phòng; phòng 0 cán bộ không chia cho 0', () => {
    const anThi = tk.phongGiaoDich[0];
    expect(anThi.tyLePhu).toBe(38); // 3/8
    expect(anThi.tabHayDung).toBe('qua-tang');
    expect(anThi.theoTab['hanh-trinh']).toBe(2);
    expect(anThi.theoTab.checklist).toBe(0);
    const banLe = tk.phongKhac.find((p) => p.code === 'BL')!;
    expect(banLe.tyLePhu).toBe(0);
    expect(banLe.tabHayDung).toBeNull();
    expect(banLe.xemGanNhat).toBeNull();
  });

  it('tóm tắt Phòng giao dịch: đã dùng / tổng và tên phòng còn đứng ngoài', () => {
    expect(tomTatPhongGiaoDich(tk)).toEqual({ daDung: 1, tong: 2, chuaDung: ['Phòng giao dịch Văn Lâm'] });
  });

  it('tổng hợp chung đọc đúng từ jsonb', () => {
    expect(tk.tong).toEqual({ luot: 42, nguoi: 12, soPhong: 4, soPhongDung: 2, soCanBo: 100 });
    expect(tk.tu).toBe('2026-08-12');
  });
});

describe('Thống kê FDI Hub — khoảng thời gian và ô ma trận', () => {
  it('«30 ngày qua» tính cả hôm nay; «Từ đầu» không chặn', () => {
    const homNay = new Date(2026, 8, 10); // 10/09/2026 giờ máy
    expect(tinhKhoang('30', homNay)).toEqual({ tu: '2026-08-12', den: '2026-09-10' });
    expect(tinhKhoang('7', homNay)).toEqual({ tu: '2026-09-04', den: '2026-09-10' });
    expect(tinhKhoang('tat-ca', homNay)).toEqual({ tu: null, den: null });
  });

  it('mức tô ô theo tỷ lệ với ô lớn nhất', () => {
    expect(mucToO(0, 10)).toBe(0);
    expect(mucToO(1, 10)).toBe(1);
    expect(mucToO(3, 10)).toBe(2);
    expect(mucToO(6, 10)).toBe(3);
    expect(mucToO(10, 10)).toBe(4);
    expect(mucToO(5, 0)).toBe(0);
  });
});
