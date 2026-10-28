import {describe, expect, it, vi} from 'vitest';

vi.mock('cloudflare:workers', () => ({env: {DB: {}}}));

import {listPortals} from '~/lib/portals';
import type {User} from '~/lib/roles';

const user = (role: User['role']): User => ({
  email: `${role}@example.com`,
  id: `user_${role}`,
  name: 'Test User',
  role,
});

const dbWithSeat = (seat: string) =>
  ({
    prepare() {
      return {
        bind() {
          return {
            all: async () => ({results: [{seat}]}),
          };
        },
      };
    },
  }) as unknown as D1Database;

describe('listPortals', () => {
  it('lets the principal submit a grant and still review', async () => {
    await expect(listPortals(dbWithSeat('principal'), user('principal'))).resolves.toEqual([
      'teacher',
      'reviewer',
    ]);
  });

  it('does not give a committee reviewer a submit portal', async () => {
    await expect(listPortals(dbWithSeat('committee'), user('committee'))).resolves.toEqual([
      'reviewer',
    ]);
  });
});
