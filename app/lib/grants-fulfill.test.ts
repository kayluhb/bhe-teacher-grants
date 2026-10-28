import {describe, expect, it, vi} from 'vitest';

vi.mock('cloudflare:workers', () => ({env: {DB: {}}}));

import {fulfillGrant} from '~/lib/grants';
import type {User} from '~/lib/roles';

const admin: User = {
  email: 'treasurer@bheeagles.com',
  id: 'admin-1',
  name: 'Treasurer',
  role: 'admin',
};

const approvedGrant = {
  approved_amount: 240,
  id: 'grant-1',
  requested_amount: 240,
  status: 'APPROVED',
};

type Statement = {args: unknown[]; sql: string};

const fulfillDb = () => {
  const statements: Statement[] = [];
  const db = {
    batch: async (batchStatements: Statement[]) => {
      statements.push(...batchStatements);
    },
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          const statement: Statement & {
            all: () => Promise<{results: {id: string}[]}>;
            first: () => Promise<typeof approvedGrant | null>;
            run: () => Promise<{meta: {changes: number}}>;
          } = {
            args,
            sql,
            all: async () => ({results: [{id: 'item-1'}]}),
            first: async () => (sql.includes('FROM grants') ? approvedGrant : null),
            run: async () => {
              statements.push({args, sql});
              return {meta: {changes: 1}};
            },
          };
          return statement;
        },
      };
    },
  };
  return {db: db as unknown as D1Database, statements};
};

describe('fulfillGrant', () => {
  it('records the entered amount spent instead of summing line prices', async () => {
    const {db, statements} = fulfillDb();

    const result = await fulfillGrant(db, {
      actor: admin,
      actualAmount: 214.37,
      grantId: approvedGrant.id,
      items: [{id: 'item-1', item_status: 'PURCHASED', variance_note: null}],
      receiptR2Key: null,
      varianceNote: null,
    });

    expect(result).toEqual({actualAmount: 214.37, variance: -25.63});
    const grantUpdate = statements.find((statement) => statement.sql.startsWith('UPDATE grants'));
    expect(grantUpdate?.args[0]).toBe(214.37);
  });

  it('stores a substituted item note as what was bought', async () => {
    const {db, statements} = fulfillDb();

    const result = await fulfillGrant(db, {
      actor: admin,
      actualAmount: 214.37,
      grantId: approvedGrant.id,
      items: [{id: 'item-1', item_status: 'SUBSTITUTED', variance_note: 'Soft bins'}],
      receiptR2Key: null,
      varianceNote: null,
    });

    expect(result).toEqual({actualAmount: 214.37, variance: -25.63});
    const itemUpdate = statements.find((statement) => statement.sql.includes('UPDATE grant_items'));
    expect(itemUpdate?.args[0]).toBe('SUBSTITUTED');
    expect(itemUpdate?.args[1]).toBe('Soft bins');
    expect(itemUpdate?.args[4]).toBe('Soft bins');
  });

  it('leaves line prices empty', async () => {
    const {db, statements} = fulfillDb();

    const result = await fulfillGrant(db, {
      actor: admin,
      actualAmount: 50,
      grantId: approvedGrant.id,
      items: [
        {
          actual_quantity: 2,
          actual_unit_price: 10,
          id: 'item-1',
          item_status: 'PURCHASED',
          variance_note: 'backordered one',
        },
      ],
      receiptR2Key: null,
      varianceNote: null,
    });

    expect(result).toEqual({actualAmount: 50, variance: -190});
    const itemUpdate = statements.find((statement) => statement.sql.includes('UPDATE grant_items'));
    expect(itemUpdate?.args[2]).toBeNull();
    expect(itemUpdate?.args[3]).toBeNull();
    expect(statements.some((statement) => statement.sql.includes('INSERT INTO grant_items'))).toBe(
      false,
    );
  });
});
