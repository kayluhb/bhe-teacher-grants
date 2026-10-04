import type {User} from '~/lib/auth';

export const canDeleteGrant = (
  actor: User,
  grant: {status: string; teacher_id: string},
): boolean => {
  if (actor.role === 'admin') return true;
  return actor.role === 'teacher' && grant.teacher_id === actor.id && grant.status === 'DRAFT';
};
