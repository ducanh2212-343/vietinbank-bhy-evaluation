// Mapping trạng thái bản ghi đánh giá -> hiển thị & người cần xử lý

export type SubmissionRow = {
  id: string;
  status: string; // draft|submitted|reviewed|returned|approved|closed
  return_target: string | null;
  needs_manager_review_update: boolean | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  returned_at: string | null;
  pgd_reviewed_at: string | null;
};

export type DisplayStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'resubmitted'
  | 'returned_employee'
  | 'returned_manager'
  | 'reviewed'
  | 'approved'
  | 'closed';

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang tự đánh giá',
  submitted: 'Đã gửi cấp trên',
  resubmitted: 'Cán bộ đã gửi lại',
  returned_employee: 'Trả lại cán bộ chỉnh sửa',
  returned_manager: 'PGĐ trả lại Trưởng phòng',
  reviewed: 'Chờ PGĐ duyệt',
  approved: 'Đã duyệt',
  closed: 'Đã khoá kỳ',
};

export const STATUS_TONE: Record<DisplayStatus, string> = {
  not_started: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-sky-100 text-sky-800 border-sky-200',
  submitted: 'bg-amber-100 text-amber-800 border-amber-200',
  resubmitted: 'bg-amber-200 text-amber-900 border-amber-300',
  returned_employee: 'bg-orange-100 text-orange-800 border-orange-200',
  returned_manager: 'bg-orange-100 text-orange-800 border-orange-200',
  reviewed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-violet-100 text-violet-800 border-violet-200',
};

export function toDisplayStatus(row: SubmissionRow | null | undefined): DisplayStatus {
  if (!row) return 'not_started';
  const s = row.status;
  if (s === 'closed') return 'closed';
  if (s === 'approved') return 'approved';
  if (s === 'reviewed') return 'reviewed';
  if (s === 'returned') {
    return row.return_target === 'manager' ? 'returned_manager' : 'returned_employee';
  }
  if (s === 'submitted') {
    return row.needs_manager_review_update ? 'resubmitted' : 'submitted';
  }
  // draft
  if (row.submitted_at || row.returned_at) return 'in_progress';
  return 'in_progress';
}

export type ActorRole = 'employee' | 'manager' | 'pgd' | 'director' | 'done';

export function getActorNeeded(d: DisplayStatus): ActorRole {
  switch (d) {
    case 'not_started':
    case 'in_progress':
    case 'returned_employee':
      return 'employee';
    case 'submitted':
    case 'resubmitted':
    case 'returned_manager':
      return 'manager';
    case 'reviewed':
      return 'pgd';
    case 'approved':
    case 'closed':
      return 'done';
  }
}

export const ACTOR_LABEL: Record<ActorRole, string> = {
  employee: 'Cán bộ',
  manager: 'Trưởng phòng',
  pgd: 'PGĐ phụ trách',
  director: 'Giám đốc',
  done: '—',
};
