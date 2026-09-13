import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IdeaCouncilVoteForm } from '../IdeaCouncilVoteForm';
import type { CouncilVote } from '../useIdeaCouncil';

// Ca thật 11/09/2026: Hội đồng chấm 20 ý tưởng trên điện thoại giữa cuộc họp,
// các thẻ trông na ná nhau nên gửi nhầm phiếu sang thẻ bên cạnh. Phiếu gửi rồi
// là đã vào tổng hợp. Bộ test này khóa hai điều:
//   1. Thiếu câu thì báo lỗi NGAY, không bắt người dùng đếm ngược xong mới biết.
//   2. Phiếu đủ câu vẫn phải qua nhịp xác nhận 3 giây mới gửi đi được.

const PHIEU_DU: CouncilVote = {
  id: 'v1',
  itemId: 'i1',
  userId: 'u1',
  status: 'draft',
  xungDot: 'khong',
  diem: { problem: 4, impact: 4, feasible: 4, safety: 4, scale: 4 },
  deXuat: 'vuon_canh',
  gopY: null,
  updatedAt: '2026-09-11T03:00:00.000Z',
};

describe('Phiếu chấm của Hội đồng — nhịp xác nhận 3 giây', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('phiếu chưa đủ câu: bấm gửi báo lỗi ngay, KHÔNG mở đếm ngược', () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<IdeaCouncilVoteForm myVote={null} readOnly={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('GỬI PHIẾU CHẤM ĐIỂM'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText(/Xem lại tên ý tưởng…/)).toBeNull();
    // Vẫn là nút gửi ban đầu, kèm danh sách lỗi
    expect(screen.getByText('GỬI PHIẾU CHẤM ĐIỂM')).toBeTruthy();
  });

  it('phiếu đủ câu: bấm lần một chỉ mở nút xác nhận đang khóa', () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<IdeaCouncilVoteForm myVote={PHIEU_DU} readOnly={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('GỬI PHIẾU CHẤM ĐIỂM'));
    expect(onSubmit).not.toHaveBeenCalled();

    const cho = screen.getByText(/Xem lại tên ý tưởng… 3s/);
    expect((cho.closest('button') as HTMLButtonElement).disabled).toBe(true);

    // Bấm tiếp ngay lập tức cũng không gửi — đây là chỗ chặn bấm nhầm
    fireEvent.click(cho);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hết 3 giây mới gửi được, và gửi đúng trạng thái submitted', () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<IdeaCouncilVoteForm myVote={PHIEU_DU} readOnly={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('GỬI PHIẾU CHẤM ĐIỂM'));
    act(() => { vi.advanceTimersByTime(3000); });
    fireEvent.click(screen.getByText('Xác nhận: GỬI PHIẾU CHẤM ĐIỂM'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toBe('submitted');
  });

  it('«Lưu nháp» KHÔNG phải chờ — nháp chưa vào tổng hợp nên bấm nhầm không hại', () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<IdeaCouncilVoteForm myVote={null} readOnly={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Lưu nháp'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toBe('draft');
  });
});
