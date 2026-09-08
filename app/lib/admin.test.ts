import {describe, expect, it} from 'vitest';
import {deleteUserError, rosterLockError} from '~/lib/login-email';

describe('rosterLockError', () => {
  it('blocks changing the principal role', () => {
    expect(rosterLockError('kathryn.achtermann@austinisd.org', 'role')).toBe(
      'The principal role is tied to that AISD email.',
    );
  });

  it('blocks changing the admin role', () => {
    expect(rosterLockError('treasurer@bheeagles.com', 'role')).toBe(
      'The admin role is tied to that BHE email.',
    );
  });

  it('blocks removing the principal', () => {
    expect(rosterLockError('kathryn.achtermann@austinisd.org', 'delete')).toBe(
      'The principal cannot be removed from the roster.',
    );
  });

  it('blocks removing the admin', () => {
    expect(rosterLockError('treasurer@bheeagles.com', 'delete')).toBe(
      'The admin cannot be removed from the roster.',
    );
  });

  it('allows other emails', () => {
    expect(rosterLockError('teacher@austinisd.org', 'role')).toBeNull();
    expect(rosterLockError('committee@bheeagles.com', 'delete')).toBeNull();
  });
});

describe('deleteUserError', () => {
  const removable = {
    actorId: 'user_admin',
    email: 'teacher@austinisd.org',
    userId: 'user_teacher',
  };

  it('allows removing a person even when they have grant requests', () => {
    expect(deleteUserError(removable)).toBeNull();
  });

  it('blocks removing yourself', () => {
    expect(deleteUserError({...removable, actorId: 'user_teacher'})).toBe(
      'You cannot remove yourself.',
    );
  });

  it('blocks removing the admin', () => {
    expect(
      deleteUserError({
        ...removable,
        email: 'treasurer@bheeagles.com',
        userId: 'user_admin',
      }),
    ).toBe('The admin cannot be removed from the roster.');
  });
});
