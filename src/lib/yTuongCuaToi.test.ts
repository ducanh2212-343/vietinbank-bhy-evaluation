import { describe, it, expect } from 'vitest';
import { chipTheoCap, demTheoCap, docCapDo, docVaiTro, laCapHoiDong } from './yTuongCuaToi';

describe('yTuongCuaToi — đếm ý tưởng của tôi theo cấp hiện tại', () => {
  it('mỗi ý tưởng chỉ nằm ở một ô — ý tưởng lên Vươn cành không còn đếm ở Bén rễ', () => {
    // Trần Hà Trang sau công bố 16/09/2026: 2 Ươm mầm, 2 Bén rễ, 1 Vươn cành
    const dem = demTheoCap([
      { capDo: 'Ươm mầm' }, { capDo: 'Ươm mầm' },
      { capDo: 'Bén rễ' }, { capDo: 'Bén rễ' },
      { capDo: 'Vươn cành' },
    ]);
    expect(dem).toEqual({ 'Ươm mầm': 2, 'Bén rễ': 2, 'Vươn cành': 1, 'Lan tỏa': 0 });
  });

  it('danh sách rỗng → mọi ô bằng 0', () => {
    expect(demTheoCap([])).toEqual({ 'Ươm mầm': 0, 'Bén rễ': 0, 'Vươn cành': 0, 'Lan tỏa': 0 });
  });

  it('chip theo thứ tự cấp tăng dần và bỏ cấp không có ý tưởng', () => {
    const chips = chipTheoCap({ 'Ươm mầm': 0, 'Bén rễ': 2, 'Vươn cành': 1, 'Lan tỏa': 0 });
    expect(chips.map(c => `${c.so} ${c.capDo}`)).toEqual(['2 Bén rễ', '1 Vươn cành']);
    expect(chips[1].emoji).toBe('🌳');
  });

  it('đọc cấp/vai từ máy chủ có phòng hờ', () => {
    expect(docCapDo('Lan tỏa')).toBe('Lan tỏa');
    expect(docCapDo('linh tinh')).toBe('Ươm mầm');
    expect(docVaiTro('dong_de_xuat')).toBe('dong_de_xuat');
    expect(docVaiTro(null)).toBe('chu_y_tuong');
  });

  it('chỉ Vươn cành và Lan tỏa là cấp do Hội đồng quyết', () => {
    expect(laCapHoiDong('Vươn cành')).toBe(true);
    expect(laCapHoiDong('Lan tỏa')).toBe(true);
    expect(laCapHoiDong('Bén rễ')).toBe(false);
  });
});
