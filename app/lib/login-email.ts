import type {Role} from '~/lib/roles';

export const AISD_DOMAIN = 'austinisd.org';
export const BHE_DOMAIN = 'bheeagles.com';
export const TREASURER_EMAIL = 'treasurer@bheeagles.com';
export const PRINCIPAL_EMAIL = 'kathryn.achtermann@austinisd.org';

export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

const domainOf = (email: string): string => email.split('@')[1] ?? '';

const isEmailAddress = (email: string): boolean => {
  const at = email.indexOf('@');
  if (at < 1) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1 && !email.includes(' ');
};

export const roleForEmail = (raw: string): Role | null => {
  const email = normalizeEmail(raw);
  if (!isEmailAddress(email)) return null;
  if (email === TREASURER_EMAIL) return 'admin';
  if (email === PRINCIPAL_EMAIL) return 'principal';
  if (domainOf(email) === AISD_DOMAIN) return 'teacher';
  return 'committee';
};

export const persistableRole = (role: Role): Role => (role === 'principal' ? 'committee' : role);

export const displayRole = (email: string, role: Role): Role =>
  normalizeEmail(email) === PRINCIPAL_EMAIL ? 'principal' : role;

export const rosterLockError = (email: string, kind: 'delete' | 'role'): string | null => {
  const normalized = normalizeEmail(email);
  if (normalized === PRINCIPAL_EMAIL) {
    return kind === 'delete'
      ? 'The principal cannot be removed from the roster.'
      : 'The principal role is tied to that AISD email.';
  }
  if (normalized === TREASURER_EMAIL) {
    return kind === 'delete'
      ? 'The treasurer cannot be removed from the roster.'
      : 'The treasurer role is tied to that BHE email.';
  }
  return null;
};

export const isLockedRosterEmail = (email: string): boolean =>
  rosterLockError(email, 'role') !== null;

export const deleteUserError = (input: {
  actorId: string;
  email: string;
  hasGrants: boolean;
  userId: string;
}): string | null => {
  const lock = rosterLockError(input.email, 'delete');
  if (lock) return lock;
  if (input.userId === input.actorId) return 'You cannot remove yourself.';
  if (input.hasGrants) return 'This person has grant requests and cannot be removed.';
  return null;
};

export const nameFromEmail = (raw: string): string => {
  const local = normalizeEmail(raw).split('@')[0] ?? '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
