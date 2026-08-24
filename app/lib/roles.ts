import type {Portal} from '~/lib/reviewers';

export type Role = 'teacher' | 'committee' | 'admin' | 'principal';

export const ROLES: Role[] = ['teacher', 'committee', 'admin', 'principal'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Treasurer',
  committee: 'Committee',
  principal: 'Principal',
  teacher: 'Teacher',
};

export const VOTER_ROLES: Role[] = ['committee', 'admin', 'principal'];

export const ASSIGNABLE_ROLES: Role[] = ROLES.filter((role) => role !== 'principal');

export type User = {
  email: string;
  id: string;
  name: string;
  role: Role;
};

export const displayRoleLabel = (user: User, portals: Portal[] = []): string =>
  portals.includes('chairman') ? 'Chair' : ROLE_LABELS[user.role];

export const normalizeRole = (raw: string): Role | null => {
  if (raw === 'treasurer') return 'admin';
  if (ROLES.includes(raw as Role)) return raw as Role;
  return null;
};

export const homePath = (role: Role): string => (role === 'teacher' ? '/portal' : '/');

export const grantPath = (role: Role, grantId: string): string =>
  role === 'teacher' ? `/portal/${grantId}` : `/grants/${grantId}`;
