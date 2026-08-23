import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getDb} from '~/lib/db';
import {displayRole} from '~/lib/login-email';
import {homePath, normalizeRole, type Role, type User} from '~/lib/roles';

export {
  ASSIGNABLE_ROLES,
  grantPath,
  homePath,
  normalizeRole,
  ROLE_LABELS,
  ROLES,
  type Role,
  type User,
  VOTER_ROLES,
} from '~/lib/roles';

const SESSION_COOKIE = 'bhe-grants-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const isDev = process.env.NODE_ENV === 'development';

const DEV_USERS: Record<Role, User> = {
  admin: {
    email: 'treasurer@bheeagles.com',
    id: 'user_admin',
    name: 'PTA Treasurer',
    role: 'admin',
  },
  committee: {
    email: 'committee@bheeagles.com',
    id: 'user_committee',
    name: 'Sam Patel',
    role: 'committee',
  },
  principal: {
    email: 'kathryn.achtermann@austinisd.org',
    id: 'user_principal',
    name: 'Kati Achtermann',
    role: 'principal',
  },
  teacher: {
    email: 'teacher@austinisd.org',
    id: 'user_teacher',
    name: 'Jordan Lee',
    role: 'teacher',
  },
};

const CHAIRMAN_USER: User = {
  email: 'chair@bheeagles.com',
  id: 'user_chairman',
  name: 'Chris Hall',
  role: 'committee',
};

const parseDevUser = (): User | null => {
  const raw = process.env.DEV_ROLE;
  if (raw === 'otp' || raw === 'none') return null;
  if (raw === 'chairman') return CHAIRMAN_USER;
  return DEV_USERS[normalizeRole(raw || '') ?? 'admin'];
};

export const getSession = async (): Promise<User | null> => {
  if (isDev) {
    const user = parseDevUser();
    if (user) return user;
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .bind(sessionId)
    .first<User>();
  if (!row) return null;
  return {...row, role: displayRole(row.email, normalizeRole(row.role) ?? row.role)};
};

export const requireAuth = async (): Promise<User> => {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
};

export const requireRole = async (...roles: Role[]): Promise<User> => {
  const user = await requireAuth();
  if (user.role === 'admin') return user;
  if (!roles.includes(user.role)) redirect(homePath(user.role));
  return user;
};

export const requireTeacher = async (): Promise<User> => {
  const user = await requireAuth();
  if (user.role !== 'teacher') redirect(homePath(user.role));
  return user;
};

export const requireReviewer = async (): Promise<User> => {
  const user = await requireAuth();
  const {listUserSeats} = await import('~/lib/grants');
  const seats = await listUserSeats(getDb(), user.id);
  if (!seats.some((seat) => seat === 'treasurer' || seat === 'principal' || seat === 'committee')) {
    redirect(homePath(user.role));
  }
  return user;
};

export const requireChairman = async (): Promise<User> => {
  const user = await requireAuth();
  const {listUserSeats} = await import('~/lib/grants');
  const seats = await listUserSeats(getDb(), user.id);
  if (!seats.includes('chairman')) redirect(homePath(user.role));
  return user;
};

export const createSession = async (userId: string): Promise<string> => {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, userId, expiresAt)
    .run();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: true,
  });

  return sessionId;
};

export const destroySession = async (): Promise<void> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await getDb().prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }
  cookieStore.delete(SESSION_COOKIE);
};
