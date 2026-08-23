import type {Role} from '~/lib/roles';

export const AISD_DOMAIN = 'austinisd.org';
export const BHE_DOMAIN = 'bheeagles.com';
export const TREASURER_EMAIL = 'treasurer@bheeagles.com';
export const PRINCIPAL_EMAIL = 'kathryn.achtermann@austinisd.org';

export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

const domainOf = (email: string): string => email.split('@')[1] ?? '';

export const roleForEmail = (raw: string): Role | null => {
  const email = normalizeEmail(raw);
  if (!email.includes('@')) return null;
  if (email === TREASURER_EMAIL) return 'admin';
  if (email === PRINCIPAL_EMAIL) return 'principal';
  const domain = domainOf(email);
  if (domain === AISD_DOMAIN) return 'teacher';
  if (domain === BHE_DOMAIN) return 'committee';
  return null;
};

export const persistableRole = (role: Role): Role => (role === 'principal' ? 'committee' : role);

export const displayRole = (email: string, role: Role): Role =>
  normalizeEmail(email) === PRINCIPAL_EMAIL ? 'principal' : role;

export const nameFromEmail = (raw: string): string => {
  const local = normalizeEmail(raw).split('@')[0] ?? '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
