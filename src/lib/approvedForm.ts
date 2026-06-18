import { supabase } from '@/integrations/supabase/client';

export const APPROVED_STATUSES: Array<'reviewed' | 'approved' | 'closed'> = ['reviewed', 'approved', 'closed'];

export interface ApprovedFormMeta {
  id: string;
  cycle_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  employee_id: string;
  cycle_name?: string;
  reviewer_name?: string;
  manager_overall_review?: any;
  pgd_overall_review?: any;
  director_overall_review?: any;
  manager_comment?: string | null;
  pgd_comment?: string | null;
  updated_at?: string | null;
}

export interface FormStatusMeta {
  label: string;
  note: string;
  tone: 'amber' | 'blue' | 'orange' | 'green' | 'slate';
  isApproved: boolean;
  badgeClass: string;
}

export function getFormStatusMeta(status: string | null | undefined): FormStatusMeta {
  switch (status) {
    case 'draft':
      return {
        label: 'Bản nháp',
        note: 'Cán bộ đang chỉnh sửa — số liệu chưa được lãnh đạo xác nhận.',
        tone: 'amber',
        isApproved: false,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    case 'submitted':
      return {
        label: 'Đã nộp — chờ duyệt',
        note: 'Cán bộ đã nộp, đang chờ Trưởng phòng / PGĐ duyệt.',
        tone: 'blue',
        isApproved: false,
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    case 'returned':
      return {
        label: 'Trả lại',
        note: 'Lãnh đạo đã trả lại — cán bộ cần chỉnh sửa và nộp lại.',
        tone: 'orange',
        isApproved: false,
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
      };
    case 'reviewed':
      return {
        label: 'Đã duyệt cấp Trưởng phòng',
        note: 'Kết quả đã được Trưởng phòng duyệt.',
        tone: 'green',
        isApproved: true,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    case 'approved':
      return {
        label: 'Đã duyệt cấp PGĐ/GĐ',
        note: 'Kết quả đã được Phó giám đốc / Giám đốc duyệt.',
        tone: 'green',
        isApproved: true,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    case 'closed':
      return {
        label: 'Kỳ đã đóng',
        note: 'Kỳ đánh giá đã đóng, kết quả là chính thức.',
        tone: 'slate',
        isApproved: true,
        badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
      };
    default:
      return {
        label: status || 'Không xác định',
        note: 'Trạng thái không xác định.',
        tone: 'slate',
        isApproved: false,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      };
  }
}

const SELECT_COLS =
  'id, cycle_id, status, submitted_at, reviewed_at, updated_at, reviewer_id, employee_id, manager_overall_review, pgd_overall_review, director_overall_review, manager_comment, pgd_comment, evaluation_cycles(name, start_date), reviewer:profiles!form_submissions_reviewer_id_fkey(full_name)';

function mapRow(r: any): ApprovedFormMeta {
  return {
    id: r.id,
    cycle_id: r.cycle_id,
    status: r.status,
    submitted_at: r.submitted_at,
    reviewed_at: r.reviewed_at,
    updated_at: r.updated_at,
    reviewer_id: r.reviewer_id,
    employee_id: r.employee_id,
    cycle_name: r.evaluation_cycles?.name,
    reviewer_name: r.reviewer?.full_name,
    manager_overall_review: r.manager_overall_review,
    pgd_overall_review: r.pgd_overall_review,
    director_overall_review: r.director_overall_review,
    manager_comment: r.manager_comment,
    pgd_comment: r.pgd_comment,
  };
}

/** Fetch ALL form submissions for an employee, regardless of status, newest first. */
export async function fetchAllForms(employeeId: string): Promise<ApprovedFormMeta[]> {
  const { data } = await supabase
    .from('form_submissions')
    .select(SELECT_COLS)
    .eq('employee_id', employeeId)
    .order('updated_at', { ascending: false });
  return (data || []).map(mapRow);
}

/** Fetch only approved/reviewed/closed forms (kept for places that explicitly need it, e.g. trend chart). */
export async function fetchApprovedForms(employeeId: string): Promise<ApprovedFormMeta[]> {
  const { data } = await supabase
    .from('form_submissions')
    .select(SELECT_COLS)
    .eq('employee_id', employeeId)
    .in('status', APPROVED_STATUSES)
    .order('reviewed_at', { ascending: false });
  return (data || []).map(mapRow);
}

/** Latest form regardless of status. */
export async function fetchLatestForm(employeeId: string): Promise<ApprovedFormMeta | null> {
  const list = await fetchAllForms(employeeId);
  return list[0] || null;
}

/** Backwards-compat alias — now returns latest form of ANY status. */
export const fetchLatestApprovedForm = fetchLatestForm;
