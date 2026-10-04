import type {User} from '~/lib/auth';
import {hasReviewStarted} from '~/lib/grant-cycle';

export type MutateGrantCycle = {review_starts_at: string | null};

/** Teacher may edit/delete their own DRAFT, or PENDING before review starts. */
export const canTeacherMutateGrant = (
  actor: User,
  grant: {status: string; teacher_id: string},
  cycle: MutateGrantCycle | null | undefined,
  now = new Date(),
): boolean => {
  if (actor.role !== 'teacher' || grant.teacher_id !== actor.id) return false;
  if (grant.status === 'DRAFT') return true;
  if (grant.status !== 'PENDING') return false;
  return !hasReviewStarted(cycle ?? {review_starts_at: null}, now);
};

export const canDeleteGrant = (
  actor: User,
  grant: {status: string; teacher_id: string},
  cycle?: MutateGrantCycle | null,
  now = new Date(),
): boolean => {
  if (actor.role === 'admin') return true;
  return canTeacherMutateGrant(actor, grant, cycle, now);
};
