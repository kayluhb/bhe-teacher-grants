import type {Portal} from '~/lib/reviewers';

export type Role = 'teacher' | 'committee' | 'chair' | 'admin' | 'principal';

export const ROLES: Role[] = ['teacher', 'committee', 'chair', 'admin', 'principal'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  chair: 'Chair',
  committee: 'Committee',
  principal: 'Principal',
  teacher: 'Teacher',
};

export const VOTER_ROLES: Role[] = ['committee', 'admin', 'principal'];

export const ASSIGNABLE_ROLES: Role[] = ROLES.filter((role) => role !== 'principal');

export type User = {
  /** Real role when an admin is previewing another role. */
  baseRole?: Role;
  email: string;
  id: string;
  name: string;
  role: Role;
};

export const displayRoleLabel = (user: User, portals: Portal[] = []): string =>
  portals.includes('chairman') ? 'Chair' : ROLE_LABELS[user.role];

export const normalizeRole = (raw: string): Role | null => {
  if (raw === 'treasurer') return 'admin';
  if (raw === 'chairman') return 'chair';
  if (ROLES.includes(raw as Role)) return raw as Role;
  return null;
};

export const homePath = (role: Role): string => {
  if (role === 'chair') return '/chair';
  return '/';
};

export const homePathForPortals = (user: User, portals: Portal[]): string => {
  if (user.role === 'chair' || portals.includes('chairman')) return '/chair';
  return '/';
};

export const grantPath = (role: Role, grantId: string): string =>
  role === 'teacher' ? `/portal/${grantId}` : `/grants/${grantId}`;
