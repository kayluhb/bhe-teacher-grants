import type {User} from '~/lib/auth';
import {getGrant, userCanAccessGrant} from '~/lib/grants';

export const grantIdFromFileKey = (
  key: string,
): {draftUserId?: string; grantId?: string} | null => {
  const draft = /^quotes\/draft\/([^/]+)\//.exec(key);
  if (draft) return {draftUserId: draft[1]};
  const quotes = /^quotes\/([^/]+)\//.exec(key);
  if (quotes) return {grantId: quotes[1]};
  const other = /^(receipts|delivery)\/([a-z0-9]+)-/i.exec(key);
  if (other) return {grantId: other[2]};
  return null;
};

export const userCanReadFile = async (
  db: D1Database,
  user: User,
  key: string,
): Promise<boolean> => {
  const parsed = grantIdFromFileKey(key);
  if (!parsed) return false;
  if (parsed.draftUserId) return user.role === 'admin' || user.id === parsed.draftUserId;
  if (!parsed.grantId) return false;
  const grant = await getGrant(db, parsed.grantId);
  if (!grant) return false;
  return userCanAccessGrant(db, user, grant);
};
