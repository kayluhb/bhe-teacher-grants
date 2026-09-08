import type {User} from '~/lib/auth';
import {listUserSeats} from '~/lib/grants';
import type {Portal} from '~/lib/reviewers';
import {isViewingAs, portalsForViewAs} from '~/lib/view-as';

export {homePathForPortals} from '~/lib/roles';

export const listPortals = async (db: D1Database, user: User): Promise<Portal[]> => {
  if (isViewingAs(user)) return portalsForViewAs(user.role);

  const portals: Portal[] = [];
  if (user.role === 'teacher') portals.push('teacher');
  if (user.role === 'admin') portals.push('treasurer');
  if (user.role === 'chair') portals.push('chairman');
  const seats = await listUserSeats(db, user.id);
  if (seats.some((seat) => seat === 'treasurer' || seat === 'principal' || seat === 'committee')) {
    portals.push('reviewer');
  }
  if (seats.includes('chairman') && !portals.includes('chairman')) portals.push('chairman');
  return portals;
};
