import {describe, expect, it} from 'vitest';
import type {User} from '~/lib/roles';
import {
  applyViewAs,
  canManageViewAs,
  isViewingAs,
  parseViewAsRole,
  portalsForViewAs,
} from '~/lib/view-as';

const admin: User = {
  email: 'treasurer@bheeagles.com',
  id: 'user_admin',
  name: 'PTA Treasurer',
  role: 'admin',
};

const teacher: User = {
  email: 'teacher@austinisd.org',
  id: 'user_teacher',
  name: 'Jordan Lee',
  role: 'teacher',
};

describe('parseViewAsRole', () => {
  it('accepts previewable roles', () => {
    expect(parseViewAsRole('teacher')).toBe('teacher');
    expect(parseViewAsRole('committee')).toBe('committee');
    expect(parseViewAsRole('chair')).toBe('chair');
    expect(parseViewAsRole('principal')).toBe('principal');
  });

  it('rejects admin and junk', () => {
    expect(parseViewAsRole('admin')).toBeNull();
    expect(parseViewAsRole('')).toBeNull();
    expect(parseViewAsRole(null)).toBeNull();
    expect(parseViewAsRole('nope')).toBeNull();
  });
});

describe('applyViewAs', () => {
  it('overrides an admin into the preview role and keeps baseRole', () => {
    expect(applyViewAs(admin, 'teacher')).toEqual({
      ...admin,
      baseRole: 'admin',
      role: 'teacher',
    });
  });

  it('does nothing for non-admins', () => {
    expect(applyViewAs(teacher, 'committee')).toEqual(teacher);
  });

  it('does nothing when there is no preview role', () => {
    expect(applyViewAs(admin, null)).toEqual(admin);
  });
});

describe('isViewingAs / canManageViewAs', () => {
  it('detects an active preview', () => {
    const preview = applyViewAs(admin, 'chair');
    expect(isViewingAs(preview)).toBe(true);
    expect(canManageViewAs(preview)).toBe(true);
  });

  it('lets a real admin manage preview', () => {
    expect(isViewingAs(admin)).toBe(false);
    expect(canManageViewAs(admin)).toBe(true);
  });

  it('blocks teachers from managing preview', () => {
    expect(canManageViewAs(teacher)).toBe(false);
  });
});

describe('portalsForViewAs', () => {
  it('maps each role to the portals that role typically sees', () => {
    expect(portalsForViewAs('teacher')).toEqual(['teacher']);
    expect(portalsForViewAs('committee')).toEqual(['reviewer']);
    expect(portalsForViewAs('principal')).toEqual(['reviewer']);
    expect(portalsForViewAs('chair')).toEqual(['chairman']);
    expect(portalsForViewAs('admin')).toEqual(['treasurer']);
  });
});
