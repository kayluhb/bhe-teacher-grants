import {describe, expect, it} from 'vitest';
import {displayRoleLabel, grantPath, homePath} from '~/lib/roles';

const chair = {
  email: 'chris@example.com',
  id: 'user_chair',
  name: 'Chris Hall',
  role: 'committee' as const,
};

describe('homePath', () => {
  it('sends teachers to the portal', () => {
    expect(homePath('teacher')).toBe('/portal');
  });

  it('sends staff to the current-iteration home', () => {
    expect(homePath('admin')).toBe('/');
    expect(homePath('committee')).toBe('/');
    expect(homePath('principal')).toBe('/');
  });
});

describe('displayRoleLabel', () => {
  it('labels a chairman as Chair even though the stored role is committee', () => {
    expect(displayRoleLabel(chair, ['chairman'])).toBe('Chair');
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
  });
});
