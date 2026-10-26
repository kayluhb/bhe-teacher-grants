import {firstParam} from '~/lib/filters';
import {PRINCIPAL_EMAIL} from '~/lib/login-email';
import {ROLES, type Role} from '~/lib/roles';

export const ROSTER_PAGE_SIZE = 10;

export type RosterRoleFilter = Role | 'all';

export type RosterQuery = {
  page: number;
  pageSize: number;
  q: string;
  role: RosterRoleFilter;
};

export type RosterWhere = {
  binds: string[];
  sql: string;
};

const DISPLAYED_ROLE_SQL = `CASE
  WHEN lower(email) = ? THEN 'principal'
  WHEN role IN ('treasurer', 'admin') THEN 'admin'
  WHEN role IN ('chairman', 'chair') THEN 'chair'
  ELSE role
END`;

const parsePage = (value: string | undefined): number => {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  return Math.min(Number(value), 10_000);
};

const parseRole = (value: string | undefined): RosterRoleFilter =>
  value && ROLES.includes(value as Role) ? (value as Role) : 'all';

export const parseRosterQuery = (
  search: {
    page?: string | string[];
    q?: string | string[];
    role?: string | string[];
  },
  pageSize = ROSTER_PAGE_SIZE,
): RosterQuery => ({
  page: parsePage(firstParam(search.page)),
  pageSize,
  q: (firstParam(search.q) ?? '').trim(),
  role: parseRole(firstParam(search.role)),
});

export const likeContains = (raw: string): string | null => {
  const term = raw.trim();
  if (!term) return null;
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
};

export const rosterWhere = (query: Pick<RosterQuery, 'q' | 'role'>): RosterWhere => {
  const binds: string[] = [];
  const parts: string[] = [];
  if (query.role !== 'all') {
    parts.push(`(${DISPLAYED_ROLE_SQL}) = ?`);
    binds.push(PRINCIPAL_EMAIL, query.role);
  }
  const pattern = likeContains(query.q);
  if (pattern) {
    parts.push(`(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')`);
    binds.push(pattern, pattern);
  }
  return {binds, sql: parts.length ? `WHERE ${parts.join(' AND ')}` : ''};
};

export const rosterPath = (input: {
  error?: string;
  page?: number;
  q?: string;
  role?: string;
  tab?: string;
}): string => {
  const params = new URLSearchParams();
  if (input.tab) params.set('tab', input.tab);
  if (input.error) params.set('error', input.error);
  const q = input.q?.trim();
  if (q) params.set('q', q);
  if (input.role && input.role !== 'all') params.set('role', input.role);
  if (input.page && input.page > 1) params.set('page', String(input.page));
  const query = params.toString();
  return query ? `/admin?${query}` : '/admin';
};
