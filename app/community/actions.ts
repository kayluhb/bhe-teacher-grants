'use server';

import {env} from 'cloudflare:workers';
import {requireAuth} from '~/lib/auth';
import {
  canViewGrantSummary,
  type ItemPile,
  type ModelSorter,
  sortItemsWithModel,
} from '~/lib/community';
import {listSummaryItems} from '~/lib/community-page';
import {getDb} from '~/lib/db';
import {listUserSeats} from '~/lib/grants';

export const sortGrantItemsAction = async (
  cycleId: string,
): Promise<{ok: true; piles: ItemPile[]} | {error: string; ok: false}> => {
  const user = await requireAuth();
  const db = getDb();
  const seats = await listUserSeats(db, user.id);
  if (!canViewGrantSummary(user, seats.includes('chairman'))) {
    return {error: 'You cannot sort this summary.', ok: false};
  }
  const items = await listSummaryItems(db, cycleId);
  const ai = env.AI as ModelSorter | undefined;
  return sortItemsWithModel(ai, items);
};
