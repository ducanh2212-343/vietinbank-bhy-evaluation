import { describe, it, expect } from 'vitest';
import { laDongChamAI, ngayVN, nhomTheoNam, sapXepHoatDong, soanDuocConnect, tachDiemNhan } from '../connect';
import { DONG_THOI_GIAN_MAC_DINH } from '@/data/one/connectDongThoiGian';

describe('soanDuocConnect — cùng luật với connect_soan_duoc() trong migration', () => {
  it('Phòng KHDN và TCTH soạn được dù chỉ là employee', () => {
    expect(soanDuocConnect(['employee'], 'KHDN')).toBe(true);
    expect(soanDuocConnect(['employee'], 'TCTH')).toBe(true);
  });
  it('admin nội dung và Ban Giám đốc soạn được ở bất kỳ phòng nào', () => {
    expect(soanDuocConnect(['tcth_admin'], 'BL')).toBe(true);
    expect(soanDuocConnect(['system_admin'], null)).toBe(true);
    expect(soanDuocConnect(['bgd'], 'BGD')).toBe(true);
  });
  it('phòng khác và khách đối tác thì không', () => {
    expect(soanDuocConnect(['employee', 'manager'], 'KHBL')).toBe(false);
    expect(soanDuocConnect(['guest'], 'KHDN')).toBe(false);
  });
});

describe('tachDiemNhan — ô nhập mỗi dòng một ý', () => {
  it('bỏ gạch đầu dòng, dòng trống, và cắt ở 6 (trần của trigger)', () => {
    expect(tachDiemNhan('- +795 tỷ\n\n• 6 KHDN mới\n  3 dự án  ')).toEqual(['+795 tỷ', '6 KHDN mới', '3 dự án']);
    expect(tachDiemNhan('1\n2\n3\n4\n5\n6\n7')).toHaveLength(6);
  });
});

describe('sắp xếp và nhóm dòng thời gian', () => {
  it('mới nhất lên đầu, cùng ngày thì nổi bật trước, nhóm theo năm giữ thứ tự đó', () => {
    const ds = [
      { ngay: '2024-11-15', noiBat: false, id: 'a' },
      { ngay: '2026-08-26', noiBat: false, id: 'b' },
      { ngay: '2026-08-26', noiBat: true, id: 'c' },
      { ngay: '2025-03-15', noiBat: false, id: 'd' },
    ];
    expect(sapXepHoatDong(ds).map((x) => x.id)).toEqual(['c', 'b', 'd', 'a']);
    const nam = nhomTheoNam(ds);
    expect(nam.map((n) => n.nam)).toEqual(['2026', '2025', '2024']);
    expect(nam[0].muc.map((x) => x.id)).toEqual(['c', 'b']);
  });

  it('bản nạp sẵn có đủ sáu mốc và đúng một dòng Chạm AI', () => {
    expect(DONG_THOI_GIAN_MAC_DINH).toHaveLength(6);
    expect(DONG_THOI_GIAN_MAC_DINH.filter(laDongChamAI)).toHaveLength(1);
    expect(DONG_THOI_GIAN_MAC_DINH.every((h) => h.tinh)).toBe(true);
  });

  it('ngày hiện theo kiểu Việt Nam', () => {
    expect(ngayVN('2026-08-26')).toBe('26/08/2026');
    expect(ngayVN('không rõ')).toBe('không rõ');
  });
});
