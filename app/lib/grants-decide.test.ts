import {describe, expect, it, vi} from 'vitest';

vi.mock('cloudflare:workers', () => ({env: {DB: {}}}));

import {decideGrant} from '~/lib/grants';
import type {User} from '~/lib/roles';
import type {GrantRow} from '~/lib/types';

const chair: User = {
  email: 'chair@bheeagles.com',
  id: 'chair-1',
  name: 'Laurin Samuelson',
  role: 'chair',
};

const pendingGrant = {
  cycle_id: 'cycle-1',
  id: 'grant-1',
  requested_amount: 465,
  status: 'PENDING',
} as GrantRow;

const decideDb = () => {
  const updates: unknown[][] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            all: async () => {
              if (sql.includes('cycle_reviewers')) {
                return {
                  results: [
                    {
                      email: chair.email,
                      name: chair.name,
                      seat: 'chairman',
                      user_id: chair.id,
                    },
                  ],
                };
              }
              return {results: []};
            },
            first: async () => (sql.includes('FROM grants') ? pendingGrant : null),
            run: async () => {
              if (sql.startsWith('UPDATE grants')) updates.push(args);
              return {meta: {changes: 1}};
            },
          };
        },
      };
    },
  };
  return {db: db as unknown as D1Database, updates};
};

describe('decideGrant', () => {
  it('saves an approved amount above the wishlist total', async () => {
    const {db, updates} = decideDb();

    const result = await decideGrant(db, {
      approvedAmount: 720,
      chairman: chair,
      comment: null,
      grantId: pendingGrant.id,
      outcome: 'APPROVED',
    });

    expect(result).toEqual({status: 'APPROVED'});
    expect(updates).toEqual([['APPROVED', 720, null, pendingGrant.id]]);
  });

  it('rejects a blank or non-positive approved amount without updating the grant', async () => {
    const {db, updates} = decideDb();

    const blank = await decideGrant(db, {
      approvedAmount: Number(''),
      chairman: chair,
      comment: null,
      grantId: pendingGrant.id,
      outcome: 'APPROVED',
    });
    const zero = await decideGrant(db, {
      approvedAmount: 0,
      chairman: chair,
      comment: null,
      grantId: pendingGrant.id,
      outcome: 'APPROVED',
    });

    expect(blank).toEqual({error: 'Enter an approved amount greater than zero.'});
    expect(zero).toEqual({error: 'Enter an approved amount greater than zero.'});
    expect(updates).toEqual([]);
  });
});
