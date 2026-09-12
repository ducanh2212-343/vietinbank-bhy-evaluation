import { describe, expect, it } from 'vitest';
import { khoaGom, ngayVn, soanTinSao, type BoiCanhTin, type PhieuSao } from '../../../supabase/functions/_shared/zaloSaoMau';

// Mẫu tin Zalo là thứ 100+ cán bộ đọc mỗi ngày — chữ sai một dòng là cả chi nhánh
// thấy. Kiểm thử khóa đúng ba quyết định của Giám đốc 12/09: lý do nguyên văn,
// tích lũy + mốc quà, mỗi người một tin, link chân tin.

const phieu = (x: Partial<PhieuSao> = {}): PhieuSao => ({
  id: 'p1', name: 'Nguyễn Thị Lan Anh', department: 'Phòng Ân Thi', sub_unit: null, stars: 1,
  reason: 'Chủ động tư vấn, phối hợp tốt tăng trưởng nguồn vốn trong tháng 8',
  result: 'Tăng trưởng nguồn vốn cho Phòng', awarded_on: '2026-09-12', sender: 'Lý Văn Tám',
  is_collective: false, recipient_profile_id: 'u1', ...x,
});

const bc: BoiCanhTin = {
  tichLuy: 5, mocQua: 'Còn 1 Sao nữa tới mốc 6 Sao — Voucher Siêu thị / Quà tặng tiện ích',
  linkChanTin: 'bachungyenone.com/one/ghi-nhan/tong-hop', toiDaDong: 10, lyDoToiDaKyTu: 300,
};

describe('soanTinSao — sao cá nhân (Mẫu 1)', () => {
  it('đủ 7 dòng theo thứ tự đã duyệt', () => {
    expect(soanTinSao([phieu()], 'moi_nguoi_mot_tin', bc).split('\n')).toEqual([
      '⭐ SAO XỨNG ĐÁNG · 12/09/2026',
      'Nguyễn Thị Lan Anh — Phòng Ân Thi vừa nhận 1 Sao',
      'Người tặng: Lý Văn Tám',
      'Vì đã: Chủ động tư vấn, phối hợp tốt tăng trưởng nguồn vốn trong tháng 8',
      'Kết quả: Tăng trưởng nguồn vốn cho Phòng',
      'Tích lũy: 5 Sao · Còn 1 Sao nữa tới mốc 6 Sao — Voucher Siêu thị / Quà tặng tiện ích',
      '👉 bachungyenone.com/one/ghi-nhan/tong-hop',
    ]);
  });
  it('lý do nguyên văn, chỉ cắt khi vượt ngưỡng', () => {
    const dai = 'A'.repeat(400);
    const tin = soanTinSao([phieu({ reason: dai })], 'moi_nguoi_mot_tin', bc);
    const dong = tin.split('\n').find((d) => d.startsWith('Vì đã:'))!;
    expect(dong.length).toBe('Vì đã: '.length + 300);
    expect(dong.endsWith('…')).toBe(true);
  });
  it('kết quả kiểu «1» hoặc rỗng thì không có dòng Kết quả', () => {
    expect(soanTinSao([phieu({ result: '1' })], 'moi_nguoi_mot_tin', bc)).not.toContain('Kết quả:');
    expect(soanTinSao([phieu({ result: '' })], 'moi_nguoi_mot_tin', bc)).not.toContain('Kết quả:');
  });
  it('chạm mốc cao nhất thì không treo mốc quà nữa', () => {
    expect(soanTinSao([phieu()], 'moi_nguoi_mot_tin', { ...bc, tichLuy: 20, mocQua: null })).toContain('Tích lũy: 20 Sao · Đã chạm mốc cao nhất 🏆');
  });
  it('không có link chân tin thì bỏ dòng cuối', () => {
    expect(soanTinSao([phieu()], 'moi_nguoi_mot_tin', { ...bc, linkChanTin: '' })).not.toContain('👉');
  });
});

describe('soanTinSao — sao tập thể (Mẫu 2)', () => {
  const tt = phieu({ id: 'p2', name: 'Tập thể PGD Ocean City', department: 'PGD Ocean City', is_collective: true, recipient_profile_id: null, sender: 'Phạm Minh Hải', reason: 'Nỗ lực trong công tác chuyển địa điểm PGD', result: '' });
  it('tiêu đề SAO TẬP THỂ, tên nguyên phiếu, câu chúc, không có mốc quà', () => {
    const tin = soanTinSao([tt], 'moi_nguoi_mot_tin', { ...bc, tichLuy: 1, mocQua: null });
    expect(tin.split('\n')).toEqual([
      '⭐ SAO TẬP THỂ · 12/09/2026',
      'Tập thể PGD Ocean City vừa nhận 1 Sao',
      'Người tặng: Phạm Minh Hải',
      'Vì đã: Nỗ lực trong công tác chuyển địa điểm PGD',
      '🎉 Chúc mừng cả tập thể!',
      '👉 bachungyenone.com/one/ghi-nhan/tong-hop',
    ]);
  });
  it('tập thể đã có sao từ trước thì nói tích lũy', () => {
    expect(soanTinSao([tt], 'moi_nguoi_mot_tin', { ...bc, tichLuy: 3, mocQua: null })).toContain('Tập thể đã có 3 Sao tích lũy');
  });
});

describe('gom trong cửa sổ', () => {
  const a = phieu({ id: 'a', name: 'Vũ Đức Thắng', recipient_profile_id: 'u2', reason: 'Đầu mối huy động vốn GPMB' });
  const b = phieu({ id: 'b', name: 'Đoàn Khuê', recipient_profile_id: 'u3', reason: 'Đầu mối huy động vốn GPMB' });
  it('mỗi người một tin: hai người khác nhau → hai khóa; cùng người → một khóa', () => {
    expect(khoaGom(a, 'moi_nguoi_mot_tin')).not.toBe(khoaGom(b, 'moi_nguoi_mot_tin'));
    expect(khoaGom(a, 'moi_nguoi_mot_tin')).toBe(khoaGom({ ...a, id: 'a2' }, 'moi_nguoi_mot_tin'));
  });
  it('phiếu không có profile thì khóa theo tên + phòng đã bỏ khoảng trắng thừa/hoa thường', () => {
    const x = phieu({ recipient_profile_id: null, name: 'Nguyễn  Thị Phượng', department: 'Phòng Ân Thi' });
    const y = phieu({ recipient_profile_id: null, name: 'nguyễn thị phượng ', department: 'phòng ân thi' });
    const z = phieu({ recipient_profile_id: null, name: 'Nguyễn Thị Phượng', department: 'Phòng TCTH' });
    expect(khoaGom(x, 'moi_nguoi_mot_tin')).toBe(khoaGom(y, 'moi_nguoi_mot_tin'));
    expect(khoaGom(x, 'moi_nguoi_mot_tin')).not.toBe(khoaGom(z, 'moi_nguoi_mot_tin'));
  });
  it('một người nhận 2 phiếu liền: tổng sao ở đầu, mỗi phiếu một dòng kèm người tặng', () => {
    const tin = soanTinSao([a, { ...a, id: 'a2', sender: 'Mai Hải Quân', reason: 'Tận tâm với khách hàng' }], 'moi_nguoi_mot_tin', bc);
    expect(tin).toContain('Vũ Đức Thắng — Phòng Ân Thi vừa nhận 2 Sao');
    expect(tin).toContain('1. 1 Sao (Lý Văn Tám tặng) — Đầu mối huy động vốn GPMB');
    expect(tin).toContain('2. 1 Sao (Mai Hải Quân tặng) — Tận tâm với khách hàng');
  });
  it('chế độ gộp theo người tặng (Mẫu 3): cùng người tặng → một khóa, liệt kê, cắt ở tối đa dòng', () => {
    expect(khoaGom(a, 'gop_theo_nguoi_tang')).toBe(khoaGom(b, 'gop_theo_nguoi_tang'));
    const ds = Array.from({ length: 12 }, (_, i) => phieu({ id: `p${i}`, name: `Cán bộ ${i}`, recipient_profile_id: `u${i}` }));
    const tin = soanTinSao(ds, 'gop_theo_nguoi_tang', bc);
    expect(tin.split('\n')[0]).toBe('⭐ 12 SAO XỨNG ĐÁNG VỪA ĐƯỢC TRAO · 12/09/2026');
    expect(tin).toContain('10. Cán bộ 9 — Phòng Ân Thi · 1 Sao');
    expect(tin).toContain('… và 2 Sao nữa cho 2 cán bộ khác');
    expect(tin).not.toContain('Tích lũy:');
  });
});

describe('ngayVn', () => {
  it('yyyy-mm-dd → dd/mm/yyyy', () => {
    expect(ngayVn('2026-09-04')).toBe('04/09/2026');
  });
});
