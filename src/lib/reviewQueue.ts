import { supabase } from '@/integrations/supabase/client';
import {
  toDisplayStatus,
  getActorNeeded,
  type SubmissionRow,
  type DisplayStatus,
} from '@/components/evaluation-tracking/statusMap';

/**
 * Hàng đợi duyệt: các phiếu trong kỳ đang chờ CHÍNH người xem xử lý —
 * TP trực tiếp (submitted / nộp lại / PGĐ trả), PGĐ phụ trách (reviewed),
 * và sole-approver (CB không có TP, viewer là reviewer được chỉ định: cả 2 pha).
 */

export interface QueueViewer {
  profileId: string;
  isManager: boolean;
  isPgd: boolean;
  isAdmin: boolean;
}

export interface QueueItem {
  profileId: string;
  fullName: string;
  deptName: string;
  formId: string;
  displayStatus: DisplayStatus;
  submittedAt: string | null;
}

type QueueFormRow = SubmissionRow & { employee_id: string; reviewer_id?: string | null };
interface QueueProfileRow {
  id: string;
  full_name: string;
  manager_id: string | null;
  pgd_id: string | null;
  departments?: { name?: string | null } | null;
}

/** Thuần (unit-test được): giữ lại phiếu đang chờ đúng người xem, sort phiếu chờ lâu nhất trước. */
export function filterQueueRows(params: {
  forms: QueueFormRow[];
  profiles: QueueProfileRow[];
  viewer: QueueViewer;
  excludeProfileId?: string;
}): QueueItem[] {
  const { forms, profiles, viewer, excludeProfileId } = params;
  const profMap = new Map(profiles.map((p) => [p.id, p]));
  const out: QueueItem[] = [];

  for (const f of forms) {
    const p = profMap.get(f.employee_id);
    if (!p) continue;
    if (excludeProfileId && p.id === excludeProfileId) continue;
    if (p.id === viewer.profileId) continue; // không tự duyệt phiếu của mình trong hàng đợi

    const display = toDisplayStatus(f);
    const actor = getActorNeeded(display);
    const isDirectManager = p.manager_id === viewer.profileId;
    const isPgdOf = p.pgd_id === viewer.profileId;
    // Sole-approver: CB không có TP trực tiếp, viewer là reviewer được chỉ định trên phiếu
    const isSoleReviewer = !p.manager_id && f.reviewer_id === viewer.profileId;

    const needsMe =
      (actor === 'manager' && (isDirectManager || isSoleReviewer)) ||
      (actor === 'pgd' && (isPgdOf || isSoleReviewer));
    if (!needsMe) continue;

    out.push({
      profileId: p.id,
      fullName: p.full_name,
      deptName: p.departments?.name || '',
      formId: f.id,
      displayStatus: display,
      submittedAt: f.submitted_at,
    });
  }

  out.sort((a, b) => {
    const ta = a.submittedAt ? Date.parse(a.submittedAt) : Number.MAX_SAFE_INTEGER;
    const tb = b.submittedAt ? Date.parse(b.submittedAt) : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb; // chờ lâu nhất lên đầu
    return a.fullName.localeCompare(b.fullName, 'vi');
  });
  return out;
}

export async function fetchReviewQueue(params: {
  viewer: QueueViewer;
  cycleId: string;
  excludeProfileId?: string;
}): Promise<QueueItem[]> {
  const { viewer, cycleId, excludeProfileId } = params;

  // Phạm vi trực tiếp: cán bộ mà viewer là TP hoặc PGĐ phụ trách
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, manager_id, pgd_id, departments!profiles_department_id_fkey(name)')
    .or(`manager_id.eq.${viewer.profileId},pgd_id.eq.${viewer.profileId}`)
    .eq('status', 'active');
  if (pErr) throw pErr;
  const profiles: QueueProfileRow[] = (profs || []) as any;

  const ids = profiles.map((p) => p.id);
  const scopeOr = ids.length
    ? `employee_id.in.(${ids.join(',')}),reviewer_id.eq.${viewer.profileId}`
    : `reviewer_id.eq.${viewer.profileId}`;

  const { data: forms, error: fErr } = await supabase
    .from('form_submissions')
    .select(
      'id, employee_id, status, return_target, needs_manager_review_update, submitted_at, reviewed_at, returned_at, pgd_reviewed_at, reviewer_id',
    )
    .eq('cycle_id', cycleId)
    .in('status', ['submitted', 'reviewed', 'returned'])
    .or(scopeOr);
  if (fErr) throw fErr;

  // Profile cho phiếu sole-reviewer nằm ngoài phạm vi TP/PGĐ trực tiếp
  const missingIds = Array.from(
    new Set((forms || []).map((f: any) => f.employee_id).filter((eid: string) => !profiles.some((p) => p.id === eid))),
  );
  let extraProfiles: QueueProfileRow[] = [];
  if (missingIds.length) {
    const { data: extra } = await supabase
      .from('profiles')
      .select('id, full_name, manager_id, pgd_id, departments!profiles_department_id_fkey(name)')
      .in('id', missingIds);
    extraProfiles = (extra || []) as any;
  }

  return filterQueueRows({
    forms: (forms || []) as any,
    profiles: [...profiles, ...extraProfiles],
    viewer,
    excludeProfileId,
  });
}
