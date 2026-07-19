// KỊCH BẢN 3 (chấm 1 chạm) + phân biệt null (chưa chấm) vs L0
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelQuickPick } from './LevelQuickPick';

describe('LevelQuickPick', () => {
  it('1 chạm chọn level', () => {
    const onChange = vi.fn();
    render(<LevelQuickPick value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('L2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('null = chưa chấm → KHÔNG nút nào active (không tô nhầm L0)', () => {
    render(<LevelQuickPick value={null} onChange={() => {}} />);
    [0, 1, 2, 3, 4].forEach((l) => {
      expect(screen.getByText(`L${l}`)).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('value=0 → đúng L0 active (0 là mức hợp lệ, khác chưa chấm)', () => {
    render(<LevelQuickPick value={0} onChange={() => {}} />);
    expect(screen.getByText('L0')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('L1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('disabled → bấm không ăn', () => {
    const onChange = vi.fn();
    render(<LevelQuickPick value={1} onChange={onChange} disabled />);
    fireEvent.click(screen.getByText('L3'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
