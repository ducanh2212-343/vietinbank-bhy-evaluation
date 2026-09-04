import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CheckCircle2 } from 'lucide-react';
import { NutXacNhanCham } from '../NutXacNhanCham';

// Ca thật 03/09/2026: Giám đốc ấn nhầm «Công nhận». Bộ test này khóa việc nút
// quyết định KHÔNG thể kích hoạt bằng hai cú bấm liên tiếp.
describe('Nút xác nhận có đồng hồ 3 giây', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('bấm một lần chưa làm gì — chỉ mở nút xác nhận đang khóa', () => {
    const onXacNhan = vi.fn();
    render(<NutXacNhanCham nhan="Công nhận Bén rễ" icon={CheckCircle2} onXacNhan={onXacNhan} lop="x" />);
    fireEvent.click(screen.getByText('Công nhận Bén rễ'));
    expect(onXacNhan).not.toHaveBeenCalled();
    const xacNhan = screen.getByText(/Đọc lại hồ sơ… 3s/);
    expect((xacNhan.closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('bấm lần hai NGAY LẬP TỨC không có tác dụng — đây là chỗ chặn bấm nhầm', () => {
    const onXacNhan = vi.fn();
    render(<NutXacNhanCham nhan="Công nhận Bén rễ" icon={CheckCircle2} onXacNhan={onXacNhan} lop="x" />);
    fireEvent.click(screen.getByText('Công nhận Bén rễ'));
    fireEvent.click(screen.getByText(/Đọc lại hồ sơ…/));
    expect(onXacNhan).not.toHaveBeenCalled();
  });

  it('hết 3 giây thì nút mở, bấm mới chạy', () => {
    const onXacNhan = vi.fn();
    render(<NutXacNhanCham nhan="Công nhận Bén rễ" icon={CheckCircle2} onXacNhan={onXacNhan} lop="x" />);
    fireEvent.click(screen.getByText('Công nhận Bén rễ'));
    act(() => { vi.advanceTimersByTime(3000); });
    const nut = screen.getByText('Xác nhận: Công nhận Bén rễ');
    expect((nut.closest('button') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(nut);
    expect(onXacNhan).toHaveBeenCalledTimes(1);
  });

  it('Hủy thì quay về nút ban đầu, không chạy gì', () => {
    const onXacNhan = vi.fn();
    render(<NutXacNhanCham nhan="Chưa đạt" icon={CheckCircle2} onXacNhan={onXacNhan} lop="x" />);
    fireEvent.click(screen.getByText('Chưa đạt'));
    fireEvent.click(screen.getByText('Hủy'));
    expect(screen.getByText('Chưa đạt')).toBeTruthy();
    expect(onXacNhan).not.toHaveBeenCalled();
  });
});
