import type {Portal} from '~/lib/reviewers';
import {normalizeRole, ROLES, type Role, type User} from '~/lib/roles';

export const VIEW_AS_COOKIE = 'bhe-view-as';
export const VIEW_AS_MAX_AGE = 60 * 60 * 8;

export const VIEW_AS_ROLES: Role[] = ROLES.filter((role) => role !== 'admin');

export const parseViewAsRole = (raw: string | null | undefined): Role | null => {
  if (!raw) return null;
  const role = normalizeRole(raw);
  if (!role || role === 'admin') return null;
  return role;
};

export const applyViewAs = (user: User, viewAs: Role | null): User => {
  if (!viewAs || user.role !== 'admin') return user;
  return {...user, baseRole: 'admin', role: viewAs};
};

export const isViewingAs = (user: User): boolean =>
  Boolean(user.baseRole && user.baseRole !== user.role);

export const canManageViewAs = (user: User): boolean =>
  user.role === 'admin' || user.baseRole === 'admin';

export const portalsForViewAs = (role: Role): Portal[] => {
  if (role === 'teacher') return ['teacher'];
  if (role === 'chair') return ['chairman'];
  if (role === 'admin') return ['treasurer'];
  return ['reviewer'];
};
