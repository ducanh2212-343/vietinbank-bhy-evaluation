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
    // admins can act on the highest pending level
    if (target.director_id === actor.profileId) return 'director';
    if (target.pgd_id === actor.profileId) return 'pgd';
    if (target.manager_id === actor.profileId) return 'manager';
    // generic admin acts as director by default
    return 'director';
  }
  if (actor.isPgd && target.pgd_id === actor.profileId) return 'pgd';
  if (actor.isManager && target.manager_id === actor.profileId) return 'manager';
  return null;
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
