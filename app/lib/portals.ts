import type {User} from '~/lib/auth';
import {listUserSeats} from '~/lib/grants';
import type {Portal} from '~/lib/reviewers';

export const listPortals = async (db: D1Database, user: User): Promise<Portal[]> => {
  const portals: Portal[] = [];
  if (user.role === 'teacher') portals.push('teacher');
  if (user.role === 'admin') portals.push('treasurer');
  const seats = await listUserSeats(db, user.id);
  if (seats.some((seat) => seat === 'treasurer' || seat === 'principal' || seat === 'committee')) {
    portals.push('reviewer');
  }
  if (seats.includes('chairman')) portals.push('chairman');
  return portals;
};

export const homePathForPortals = (user: User, portals: Portal[]): string => {
  if (user.role === 'teacher') return '/portal';
  if (portals.includes('chairman')) return '/chair';
  if (portals.includes('reviewer') && !portals.includes('treasurer')) return '/review';
  return '/';
};
