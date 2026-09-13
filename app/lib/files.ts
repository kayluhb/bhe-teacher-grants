import type {User} from '~/lib/auth';

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

/** Accept quote keys owned by this actor (draft) or this grant; otherwise null. */
export const ownedQuoteR2Key = (
  key: string | null | undefined,
  opts: {actorId: string; grantId: string},
): string | null => {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  const draftPrefix = `quotes/draft/${opts.actorId}/`;
  if (trimmed.startsWith(draftPrefix)) return trimmed;
  const grantPrefix = `quotes/${opts.grantId}/`;
  if (trimmed.startsWith(grantPrefix)) return trimmed;
  return null;
};

/** Accept delivery proof keys for this grant; otherwise null. */
export const ownedDeliveryR2Key = (
  key: string | null | undefined,
  grantId: string,
): string | null => {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith(`delivery/${grantId}-`) ? trimmed : null;
};

/** Accept receipt keys for this grant; otherwise null. */
export const ownedReceiptR2Key = (
  key: string | null | undefined,
  grantId: string,
): string | null => {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith(`receipts/${grantId}-`) ? trimmed : null;
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
  const {getGrant, userCanAccessGrant} = await import('~/lib/grants');
  const grant = await getGrant(db, parsed.grantId);
  if (!grant) return false;
  return userCanAccessGrant(db, user, grant);
};
