import type {Role} from '~/lib/roles';

const COMMUNITY_GRANT_STATUSES = ['APPROVED', 'PURCHASED', 'DELIVERED'] as const;

export {COMMUNITY_GRANT_STATUSES};

export const communityGrantVisible = (status: string): boolean =>
  (COMMUNITY_GRANT_STATUSES as readonly string[]).includes(status);

export const communityDescription = (grant: {
  community_blurb: string | null;
  impact_statement: string;
}): string => {
  const blurb = grant.community_blurb?.trim();
  return blurb || grant.impact_statement.trim();
};

/** Empty or unchanged wording keeps following the teacher's application. */
export const storedCommunityBlurb = (blurb: string, impactStatement: string): string | null => {
  const text = blurb.trim();
  if (!text || text === impactStatement.trim()) return null;
  return text;
};

export const communityItemLines = (
  items: {is_ad_hoc: number; item_description: string; item_status: string}[],
): string[] =>
  items
    .filter((item) => item.is_ad_hoc === 0 && item.item_status !== 'CANCELLED')
    .map((item) => item.item_description.trim())
    .filter(Boolean);

export const isCommunityPublished = (cycle: {community_published_at: string | null}): boolean =>
  Boolean(cycle.community_published_at);

export const canPrepareCommunityPage = (
  user: {role: Role | string},
  seatedChairman: boolean,
): boolean => user.role === 'admin' || user.role === 'chair' || seatedChairman;

export const communityPath = (cycleId: string): string => `/community/${cycleId}`;

export const COMMUNITY_INTRO_MAX = 4000;
export const COMMUNITY_BLURB_MAX = 5000;

export const validateCommunityIntro = (raw: string): {error: string} | {intro: string} => {
  const intro = raw.trim();
  if (intro.length > COMMUNITY_INTRO_MAX) return {error: 'Intro is too long.'};
  return {intro};
};
