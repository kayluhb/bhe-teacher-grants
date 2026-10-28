import {describe, expect, it, vi} from 'vitest';

vi.mock('cloudflare:workers', () => ({env: {DB: {}}}));

import {decideGrant, reviseGrantDecision} from '~/lib/grants';
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

const reviseDb = (grant: {id: string; requested_amount: number; status: string}) => {
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
            first: async () => (sql.includes('FROM grants') ? grant : null),
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

describe('reviseGrantDecision', () => {
  it('changes an approval to a rejection and clears the approved amount', async () => {
    const grant = {id: 'grant-1', requested_amount: 465, status: 'APPROVED'};
    const {db, updates} = reviseDb(grant);

    const result = await reviseGrantDecision(db, {
      chairman: chair,
      grantId: grant.id,
      note: 'Greg said this is not ready yet.',
      outcome: 'REJECTED',
    });

    expect(result).toEqual({status: 'REJECTED'});
    expect(updates[0]).toEqual([
      'REJECTED',
      null,
      'Greg said this is not ready yet.',
      grant.id,
      'APPROVED',
    ]);
  });

  it('changes a rejection to an approval when an amount is set', async () => {
    const grant = {id: 'grant-1', requested_amount: 465, status: 'REJECTED'};
    const {db, updates} = reviseDb(grant);

    const result = await reviseGrantDecision(db, {
      approvedAmount: 400,
      chairman: chair,
      grantId: grant.id,
      note: 'Greg confirmed this is ready.',
      outcome: 'APPROVED',
    });

    expect(result).toEqual({status: 'APPROVED'});
    expect(updates[0]).toEqual(['APPROVED', 400, null, grant.id, 'REJECTED']);
  });

  it('requires a note and refuses a purchased grant', async () => {
    const approved = {id: 'grant-1', requested_amount: 465, status: 'APPROVED'};
    const purchased = {id: 'grant-1', requested_amount: 465, status: 'PURCHASED'};
    const missingNote = await reviseGrantDecision(reviseDb(approved).db, {
      chairman: chair,
      grantId: approved.id,
      note: '   ',
      outcome: 'REJECTED',
    });
    const bought = await reviseGrantDecision(reviseDb(purchased).db, {
      chairman: chair,
      grantId: purchased.id,
      note: 'Too late',
      outcome: 'REJECTED',
    });

    expect(missingNote).toEqual({error: 'Add a short note about why this result changed.'});
    expect(bought).toEqual({error: 'Only an approved or rejected grant can be changed.'});
  });

  it('refuses a non-positive amount when approving again', async () => {
    const grant = {id: 'grant-1', requested_amount: 465, status: 'REJECTED'};
    const {db, updates} = reviseDb(grant);

    const result = await reviseGrantDecision(db, {
      approvedAmount: 0,
      chairman: chair,
      grantId: grant.id,
      note: 'Ready now',
      outcome: 'APPROVED',
    });

    expect(result).toEqual({error: 'Enter an approved amount greater than zero.'});
    expect(updates).toEqual([]);
  });
});
