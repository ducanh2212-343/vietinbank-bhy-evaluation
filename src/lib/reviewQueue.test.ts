import { describe, it, expect, vi } from 'vitest';

// reviewQueue import supabase client (cần env) — test chỉ dùng hàm lọc thuần
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { filterQueueRows, type QueueViewer } from './reviewQueue';

const viewer = (profileId: string, over: Partial<QueueViewer> = {}): QueueViewer => ({
  profileId,
  isManager: true,
  isPgd: false,
  isAdmin: false,
  ...over,
});

const mkForm = (over: any) => ({
  id: `form-${over.employee_id}`,
  status: 'submitted',
  return_target: null,
  needs_manager_review_update: false,
  submitted_at: '2026-07-01T00:00:00Z',
  reviewed_at: null,
  returned_at: null,
  pgd_reviewed_at: null,
  reviewer_id: null,
  ...over,
});

const mkProfile = (over: any) => ({
  full_name: `NV ${over.id}`,
  manager_id: null,
  pgd_id: null,
  departments: { name: 'Phòng A' },
  ...over,
});

describe('filterQueueRows', () => {
  it('TP thấy phiếu submitted / nộp lại / PGĐ-trả của cán bộ mình; không thấy reviewed', () => {
    const forms = [
      mkForm({ employee_id: 'e1' }), // submitted
      mkForm({ employee_id: 'e2', needs_manager_review_update: true }), // resubmitted
      mkForm({ employee_id: 'e3', status: 'returned', return_target: 'manager' }), // PGĐ trả TP
      mkForm({ employee_id: 'e4', status: 'returned', return_target: 'employee' }), // chờ CB — không phải việc TP
      mkForm({ employee_id: 'e5', status: 'reviewed' }), // chờ PGĐ
    ];
    const profiles = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => mkProfile({ id, manager_id: 'tp' }));
    const q = filterQueueRows({ forms, profiles, viewer: viewer('tp') });
    expect(q.map((x) => x.profileId).sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('PGĐ thấy phiếu reviewed của cán bộ mình phụ trách', () => {
    const forms = [
      mkForm({ employee_id: 'e1', status: 'reviewed' }),
      mkForm({ employee_id: 'e2' }), // submitted — việc của TP
    ];
    const profiles = [mkProfile({ id: 'e1', pgd_id: 'pgd' }), mkProfile({ id: 'e2', pgd_id: 'pgd' })];
    const q = filterQueueRows({ forms, profiles, viewer: viewer('pgd', { isManager: false, isPgd: true }) });
    expect(q.map((x) => x.profileId)).toEqual(['e1']);
  });

  it('sole-approver (CB không có TP, viewer là reviewer) thấy cả submitted lẫn reviewed', () => {
    const forms = [
      mkForm({ employee_id: 'e1', reviewer_id: 'pgd' }),
      mkForm({ employee_id: 'e2', status: 'reviewed', reviewer_id: 'pgd' }),
    ];
    const profiles = [
      mkProfile({ id: 'e1', manager_id: null, pgd_id: null }),
      mkProfile({ id: 'e2', manager_id: null, pgd_id: null }),
    ];
    const q = filterQueueRows({ forms, profiles, viewer: viewer('pgd', { isManager: false, isPgd: true }) });
    expect(q.map((x) => x.profileId).sort()).toEqual(['e1', 'e2']);
  });

  it('loại phiếu đang mở (excludeProfileId) và phiếu của chính mình', () => {
    const forms = [mkForm({ employee_id: 'e1' }), mkForm({ employee_id: 'tp' })];
    const profiles = [mkProfile({ id: 'e1', manager_id: 'tp' }), mkProfile({ id: 'tp', manager_id: 'tp' })];
    const q = filterQueueRows({ forms, profiles, viewer: viewer('tp'), excludeProfileId: 'e1' });
    expect(q).toHaveLength(0);
  });

  it('sort: phiếu chờ lâu nhất (submitted_at nhỏ nhất) lên đầu', () => {
    const forms = [
      mkForm({ employee_id: 'e1', submitted_at: '2026-07-03T00:00:00Z' }),
      mkForm({ employee_id: 'e2', submitted_at: '2026-07-01T00:00:00Z' }),
      mkForm({ employee_id: 'e3', submitted_at: null }),
    ];
    const profiles = ['e1', 'e2', 'e3'].map((id) => mkProfile({ id, manager_id: 'tp' }));
    const q = filterQueueRows({ forms, profiles, viewer: viewer('tp') });
    expect(q.map((x) => x.profileId)).toEqual(['e2', 'e1', 'e3']);
  });
});
