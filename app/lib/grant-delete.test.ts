import {describe, expect, it} from 'vitest';
import type {User} from '~/lib/auth';
import {canDeleteGrant} from '~/lib/grant-delete';

const teacher = (id = 't1'): User => ({
  email: 'teacher@example.com',
  id,
  name: 'Teacher',
  role: 'teacher',
});

const admin = (): User => ({
  email: 'admin@example.com',
  id: 'a1',
  name: 'Admin',
  role: 'admin',
});

describe('canDeleteGrant', () => {
  it('allows a teacher to delete their own draft', () => {
    expect(canDeleteGrant(teacher(), {status: 'DRAFT', teacher_id: 't1'})).toBe(true);
  });

  it('blocks a teacher from deleting someone else’s draft', () => {
    expect(canDeleteGrant(teacher('t1'), {status: 'DRAFT', teacher_id: 't2'})).toBe(false);
  });

  it('blocks a teacher from deleting a submitted request', () => {
    expect(canDeleteGrant(teacher(), {status: 'PENDING', teacher_id: 't1'})).toBe(false);
  });

  it('allows an admin to delete any status', () => {
    expect(canDeleteGrant(admin(), {status: 'PENDING', teacher_id: 't1'})).toBe(true);
    expect(canDeleteGrant(admin(), {status: 'DRAFT', teacher_id: 't1'})).toBe(true);
  });

  it('blocks committee roles', () => {
    expect(
      canDeleteGrant(
        {email: 'c@example.com', id: 'c1', name: 'Committee', role: 'committee'},
        {status: 'DRAFT', teacher_id: 'c1'},
      ),
    ).toBe(false);
  });
});
