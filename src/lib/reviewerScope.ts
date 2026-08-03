/**
 * Helpers to determine evaluator/approver scope for star classification
 * and overall-review blocks.
 */

export type ReviewerLevel = 'manager' | 'pgd' | 'director';

export interface ProfileLike {
  id: string;
  manager_id?: string | null;
  pgd_id?: string | null;
  director_id?: string | null;
  /** Cờ phiếu TỰ SOI — xem isSelfReviewProfile */
  self_review_only?: boolean | null;
}

/**
 * Phiếu TỰ SOI: người không có cấp trên nào trong tuyến báo cáo (Giám đốc chi nhánh).
 * Nguyên tắc Giám đốc chốt 27/07: KHÔNG cần người chấm — TỰ ĐÁNH GIÁ CHÍNH LÀ MỨC CHỐT;
 * phiếu tự nộp, tự phê duyệt; hồ sơ được miễn trừ khỏi luật "phải gán người đánh giá
 * trước khi mở kỳ".
 *
 * Nguồn sự thật DUY NHẤT là cột profiles.self_review_only (đặt bởi TCTH/quản trị).
 * Trước 08/2026 nguyên tắc nằm rải ở 3 nơi, mỗi nơi so khớp CHUỖI chức danh theo một
 * danh sách khác nhau — đổi tên chức danh là ba nơi hiểu khác nhau, và nhánh
 * "chứa 'giám đốc chi nhánh'" còn cho tự phê duyệt KỂ CẢ khi người đó có cấp trên.
 *
 * Vẫn kiểm tra lại "không có cấp trên" ở đây cho chắc: DB đã có ràng buộc
 * chk_self_review_no_supervisor, hai lớp phải cùng nói một điều.
 */
export function isSelfReviewProfile(profile: ProfileLike | null | undefined): boolean {
  if (!profile?.self_review_only) return false;
  return !profile.manager_id && !profile.pgd_id && !profile.director_id;
}

export interface ActorRoles {
  isManager: boolean;
  isPgd: boolean;
  isAdmin: boolean; // bgd / tcth_admin / system_admin
}

/**
 * Returns the evaluator level for the actor relative to the target,
 * or null if the actor is not a direct supervisor of the target.
 */
export function getReviewerLevel(
  actor: { profileId: string | null } & ActorRoles,
  target: ProfileLike | null,
): ReviewerLevel | null {
  if (!target || !actor.profileId) return null;
  if (target.id === actor.profileId) return null; // never self
  if (actor.isAdmin) {
    // Kiêm nhiệm: khi một người vừa là PGĐ phụ trách vừa là Giám đốc của cán bộ này
    // (VD Giám đốc trực tiếp phụ trách Phòng TCTH), vai THỰC THI 'pgd' — cấp duy nhất
    // có nút Phê duyệt — phải thắng vai giám sát 'director'. Xét ngược lại thì phiếu
    // kẹt vĩnh viễn ở 'reviewed' vì không còn ai khác đứng vai PGĐ (sự cố 27/07).
    if (target.pgd_id === actor.profileId) return 'pgd';
    if (target.director_id === actor.profileId) return 'director';
    if (target.manager_id === actor.profileId) return 'manager';
    // generic admin acts as director by default
    return 'director';
  }
  if (actor.isPgd && target.pgd_id === actor.profileId) return 'pgd';
  if (actor.isManager && target.manager_id === actor.profileId) return 'manager';
  return null;
}

/**
 * Người đánh giá mặc định của một cán bộ theo tuyến báo cáo:
 * Quản lý trực tiếp → PGĐ phụ trách → Giám đốc.
 * Dùng khi nộp phiếu mà chưa chọn người đánh giá — không có giá trị này thì phiếu
 * "vô chủ": không ai đứng vai nào để rà soát/phê duyệt (sự cố Dương Thị Thanh Thúy 25/07).
 */
export function resolveDefaultReviewerId(target: ProfileLike | null): string | null {
  if (!target) return null;
  return target.manager_id || target.pgd_id || target.director_id || null;
}

export function getOverallReviewField(
  level: ReviewerLevel,
): 'manager_overall_review' | 'pgd_overall_review' | 'director_overall_review' {
  if (level === 'manager') return 'manager_overall_review';
  if (level === 'pgd') return 'pgd_overall_review';
  return 'director_overall_review';
}

/** Higher level can approve a lower level's star classification. */
export function canApproveStarFor(
  actorLevel: ReviewerLevel | null,
  evaluatedAtLevel: ReviewerLevel | null,
): boolean {
  if (!actorLevel || !evaluatedAtLevel) return false;
  const order: ReviewerLevel[] = ['manager', 'pgd', 'director'];
  return order.indexOf(actorLevel) > order.indexOf(evaluatedAtLevel);
}
