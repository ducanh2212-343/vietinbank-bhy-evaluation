// KỊCH BẢN 2 — thẻ "Minh chứng L3+" hiển thị rõ (trước đây chặn nộp NGẦM) + bấm tên skill nhảy tới đúng hàng
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmissionChecklist } from './SubmissionChecklist';
import type { DetailedValidation } from '@/lib/evaluationValidation';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';

const mkSkill = (id: string, name: string): CoreSkillAssessment => ({
  skill_id: id,
  skill_name: name,
  skill_code: null,
  skill_group: '',
  minimum_level: 2,
  advanced_level: 3,
  self_assessed_level: 3,
  manager_assessed_level: null,
  evidence: '',
  employee_comment: '',
  manager_note: '',
});

const baseValidation = (over: Partial<DetailedValidation>): DetailedValidation => ({
  canSubmit: false,
  errors: [],
  coreTotal: 10,
  coreMissing: [],
  attitudeTotal: 6,
  attitudeRatingMissing: [],
  attitudeEvidenceMissing: [],
  gappedTotal: 0,
  gappedSkillsWithoutAction: [],
  gappedSkillIssues: [],
  needsImprovementTotal: 0,
  needsImprovementWithoutPlan: [],
  highLevelEvidenceMissing: [],
  ...over,
});

describe('SubmissionChecklist — thẻ Minh chứng L3+', () => {
  it('thiếu minh chứng L3+ → thẻ 4 báo đỏ, liệt kê đúng skill', () => {
    render(
      <SubmissionChecklist
        {...baseValidation({ highLevelEvidenceMissing: [mkSkill('s1', 'Tín dụng DN')] })}
        onNavigateToSkill={() => {}}
      />,
    );
    expect(screen.getByText('Minh chứng cho skill tự chấm L3+')).toBeInTheDocument();
    expect(screen.getByText(/Còn thiếu 1 skill/)).toBeInTheDocument();
    expect(screen.getByText('Tín dụng DN')).toBeInTheDocument();
  });

  it('bấm tên skill → gọi onNavigateToSkill với đúng skill_id (nhảy tới đúng hàng)', () => {
    const nav = vi.fn();
    render(
      <SubmissionChecklist
        {...baseValidation({ highLevelEvidenceMissing: [mkSkill('s1', 'Tín dụng DN')] })}
        onNavigateToSkill={nav}
      />,
    );
    fireEvent.click(screen.getByText('Tín dụng DN'));
    expect(nav).toHaveBeenCalledWith('s1');
  });

  it('đủ minh chứng → thẻ 4 xanh', () => {
    render(<SubmissionChecklist {...baseValidation({ canSubmit: true, highLevelEvidenceMissing: [] })} />);
    expect(screen.getByText('Minh chứng cho skill tự chấm L3+')).toBeInTheDocument();
    expect(screen.getAllByText(/Đã đầy đủ/).length).toBeGreaterThan(0);
  });
});
