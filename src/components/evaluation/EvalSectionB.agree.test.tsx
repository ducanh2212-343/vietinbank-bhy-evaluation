// KỊCH BẢN 3 — chống duyệt hình thức trong mục B:
//  - Đồng ý per-skill (KHÔNG có nút đồng ý tất cả)
//  - Skill cán bộ tự chấm L3+ KHÔNG cho đồng ý mù từ hàng đóng — phải mở đọc minh chứng
//  - Chấm lệch mà chưa ghi nhận xét → cảnh báo bắt buộc ngay trong hàng
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock('@/hooks/useAiFeatures', () => ({
  useAiFeatures: () => ({ isEnabled: () => false }),
}));
vi.mock('@/hooks/useSkillCriteria', () => ({
  useSkillCriteria: () => ({ getCriteria: () => [] }),
}));
vi.mock('@/hooks/useSkillLevelImages', () => ({
  useSkillLevelImages: () => ({ getImageUrl: () => null, getIconUrl: () => null, getStageImageUrl: () => null }),
}));
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { EvalSectionB, type CoreSkillAssessment } from './EvalSectionB';
import { toast } from 'sonner';

const mkSkill = (over: Partial<CoreSkillAssessment>): CoreSkillAssessment => ({
  skill_id: 's1',
  skill_name: 'Tín dụng doanh nghiệp',
  skill_code: 'SK01',
  skill_group: 'G',
  minimum_level: 2,
  advanced_level: 3,
  self_assessed_level: 2,
  manager_assessed_level: null,
  evidence: '',
  employee_comment: '',
  manager_note: '',
  ...over,
});

const renderB = (skill: CoreSkillAssessment, extra: Partial<React.ComponentProps<typeof EvalSectionB>> = {}) => {
  const onChange = vi.fn();
  const onOpenIdChange = vi.fn();
  render(
    <EvalSectionB
      assessments={[skill]}
      onChange={onChange}
      isManager
      quickRate
      quickRateTarget="manager"
      showAgreeControls
      openId={extra.openId !== undefined ? extra.openId : null}
      onOpenIdChange={onOpenIdChange}
      {...extra}
    />,
  );
  return { onChange, onOpenIdChange };
};

describe('EvalSectionB — duyệt theo ngoại lệ từng skill', () => {
  beforeEach(() => vi.clearAllMocks());

  it('KHÔNG tồn tại nút "đồng ý tất cả" ở bất kỳ đâu', () => {
    renderB(mkSkill({}));
    expect(screen.queryByText(/đồng ý tất cả/i)).toBeNull();
  });

  it('self L2: chip "Đồng ý L2" → ghi nhận manager = 2 ngay (1 chạm, có chủ đích từng skill)', () => {
    const { onChange } = renderB(mkSkill({ self_assessed_level: 2 }));
    fireEvent.click(screen.getByText('Đồng ý L2'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0][0];
    expect(updated.manager_assessed_level).toBe(2);
  });

  it('self L3 (Chuyên gia): chip đổi thành "Xem minh chứng L3" — bấm KHÔNG đồng ý mù mà MỞ hàng + nhắc đọc minh chứng', () => {
    const { onChange, onOpenIdChange } = renderB(mkSkill({ self_assessed_level: 3, evidence: 'Hồ sơ X, Y đã xử lý độc lập' }));
    expect(screen.queryByText('Đồng ý L3')).toBeNull();
    fireEvent.click(screen.getByText('Xem minh chứng L3'));
    expect(onChange).not.toHaveBeenCalled(); // không ghi level
    expect(onOpenIdChange).toHaveBeenCalledWith('core-s1'); // mở hàng để đọc minh chứng
    expect(toast.info).toHaveBeenCalled();
  });

  it('hàng ĐÃ MỞ (đã thấy minh chứng): có nút "Đồng ý L3 theo tự đánh giá" → bấm mới ghi nhận', () => {
    const { onChange } = renderB(mkSkill({ self_assessed_level: 3, evidence: 'Hồ sơ X' }), { openId: 'core-s1' });
    fireEvent.click(screen.getByText('Đồng ý L3 theo tự đánh giá'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].manager_assessed_level).toBe(3);
  });

  it('chấm LỆCH (NV L3 / QL L2) chưa ghi nhận xét → hiện cảnh báo bắt buộc + badge Lệch', () => {
    renderB(mkSkill({ self_assessed_level: 3, manager_assessed_level: 2, manager_note: '' }), { openId: 'core-s1' });
    expect(screen.getByText(/bắt buộc khi chấm lệch/i)).toBeInTheDocument();
    expect(screen.getByText(/Lệch · NV L3/)).toBeInTheDocument();
    expect(screen.getByText(/phiếu sẽ không xác nhận rà soát được nếu bỏ trống/i)).toBeInTheDocument();
  });

  it('đã ghi nhận xét trao đổi → hết cảnh báo', () => {
    renderB(
      mkSkill({
        self_assessed_level: 3,
        manager_assessed_level: 2,
        manager_note: 'Cần thêm 2 hồ sơ tự xử lý; hẹn 1-1 tuần sau.',
      }),
      { openId: 'core-s1' },
    );
    expect(screen.queryByText(/bắt buộc khi chấm lệch/i)).toBeNull();
  });
});
