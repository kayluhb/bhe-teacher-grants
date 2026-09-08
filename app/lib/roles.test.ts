import {describe, expect, it} from 'vitest';
import type {User} from '~/lib/roles';
import {
  displayRoleLabel,
  grantPath,
  homePath,
  homePathForPortals,
  normalizeRole,
} from '~/lib/roles';

const chair = {
  email: 'chris@example.com',
  id: 'user_chair',
  name: 'Chris Hall',
  role: 'committee' as const,
};

const chairRole = {
  email: 'chris@example.com',
  id: 'user_chair',
  name: 'Chris Hall',
  role: 'chair' as const,
};

const user = (role: User['role']): User => ({
  email: `${role}@example.com`,
  id: `user_${role}`,
  name: 'Test User',
  role,
});

describe('homePath', () => {
  it('sends teachers to home', () => {
    expect(homePath('teacher')).toBe('/');
  });

  it('sends chairs to the chair queue', () => {
    expect(homePath('chair')).toBe('/chair');
  });

  it('sends staff to the current-iteration home', () => {
    expect(homePath('admin')).toBe('/');
    expect(homePath('committee')).toBe('/');
    expect(homePath('principal')).toBe('/');
  });
});

describe('homePathForPortals', () => {
  it('sends teachers to home', () => {
    expect(homePathForPortals(user('teacher'), ['teacher'])).toBe('/');
  });

  it('sends chairs to the chair queue', () => {
    expect(homePathForPortals(user('chair'), ['chairman'])).toBe('/chair');
    expect(homePathForPortals(user('committee'), ['chairman'])).toBe('/chair');
  });

  it('sends reviewers to home (guide lives there, not on the queue)', () => {
    expect(homePathForPortals(user('committee'), ['reviewer'])).toBe('/');
  });

  it('sends admins to home', () => {
    expect(homePathForPortals(user('admin'), ['treasurer'])).toBe('/');
  });
});

describe('normalizeRole', () => {
  it('maps chairman to chair', () => {
    expect(normalizeRole('chairman')).toBe('chair');
    expect(normalizeRole('chair')).toBe('chair');
  });
});

describe('displayRoleLabel', () => {
  it('labels a chairman as Chair even though the stored role is committee', () => {
    expect(displayRoleLabel(chair, ['chairman'])).toBe('Chair');
  });

  it('labels the chair role as Chair', () => {
    expect(displayRoleLabel(chairRole)).toBe('Chair');
  });

  it('uses the stored role when the person is not chair', () => {
    expect(displayRoleLabel(chair, ['reviewer'])).toBe('Committee');
  });
});

describe('grantPath', () => {
  it('keeps teacher grants on the portal', () => {
    expect(grantPath('teacher', 'grant_1')).toBe('/portal/grant_1');
  });

  it('keeps staff grants on the staff list', () => {
    expect(grantPath('admin', 'grant_1')).toBe('/grants/grant_1');
    expect(grantPath('committee', 'grant_1')).toBe('/grants/grant_1');
    expect(grantPath('chair', 'grant_1')).toBe('/grants/grant_1');
  });
});
