import {describe, expect, it} from 'vitest';
import type {User} from '~/lib/auth';
import {canDeleteGrant, canTeacherMutateGrant} from '~/lib/grant-delete';

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

const beforeReview = {review_starts_at: '2026-10-15T05:00:00.000Z'};
const nowBefore = new Date('2026-10-04T12:00:00.000Z');
const nowAfter = new Date('2026-10-16T12:00:00.000Z');

describe('canTeacherMutateGrant', () => {
  it('allows a teacher to edit their own draft', () => {
    expect(
      canTeacherMutateGrant(teacher(), {status: 'DRAFT', teacher_id: 't1'}, beforeReview, nowBefore),
    ).toBe(true);
  });

  it('allows a teacher to edit their pending grant before review starts', () => {
    expect(
      canTeacherMutateGrant(
        teacher(),
        {status: 'PENDING', teacher_id: 't1'},
        beforeReview,
        nowBefore,
      ),
    ).toBe(true);
  });

  it('blocks editing a pending grant after review starts', () => {
    expect(
      canTeacherMutateGrant(
        teacher(),
        {status: 'PENDING', teacher_id: 't1'},
        beforeReview,
        nowAfter,
      ),
    ).toBe(false);
  });

  it('allows pending edits when the cycle has no review start yet', () => {
    expect(
      canTeacherMutateGrant(
        teacher(),
        {status: 'PENDING', teacher_id: 't1'},
        {review_starts_at: null},
        nowBefore,
      ),
    ).toBe(true);
  });

  it('blocks other teachers and non-pending statuses', () => {
    expect(
      canTeacherMutateGrant(
        teacher('t1'),
        {status: 'PENDING', teacher_id: 't2'},
        beforeReview,
        nowBefore,
      ),
    ).toBe(false);
    expect(
      canTeacherMutateGrant(
        teacher(),
        {status: 'APPROVED', teacher_id: 't1'},
        beforeReview,
        nowBefore,
      ),
    ).toBe(false);
    expect(
      canTeacherMutateGrant(admin(), {status: 'PENDING', teacher_id: 't1'}, beforeReview, nowBefore),
    ).toBe(false);
  });
});

describe('canDeleteGrant', () => {
  it('allows a teacher to delete their own draft', () => {
    expect(canDeleteGrant(teacher(), {status: 'DRAFT', teacher_id: 't1'}, beforeReview)).toBe(
      true,
    );
  });

  it('allows a teacher to delete their pending grant before review starts', () => {
    expect(
      canDeleteGrant(teacher(), {status: 'PENDING', teacher_id: 't1'}, beforeReview, nowBefore),
    ).toBe(true);
  });

  it('blocks a teacher from deleting a pending grant after review starts', () => {
    expect(
      canDeleteGrant(teacher(), {status: 'PENDING', teacher_id: 't1'}, beforeReview, nowAfter),
    ).toBe(false);
  });

  it('blocks a teacher from deleting someone else’s draft', () => {
    expect(canDeleteGrant(teacher('t1'), {status: 'DRAFT', teacher_id: 't2'})).toBe(false);
  });

  it('allows an admin to delete any status', () => {
    expect(canDeleteGrant(admin(), {status: 'PENDING', teacher_id: 't1'}, beforeReview)).toBe(
      true,
    );
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
