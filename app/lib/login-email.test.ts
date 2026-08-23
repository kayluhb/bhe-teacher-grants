import {describe, expect, it} from 'vitest';
import {displayRole, nameFromEmail, persistableRole, roleForEmail} from '~/lib/login-email';

describe('roleForEmail', () => {
  it('maps AISD emails to teacher', () => {
    expect(roleForEmail('jordan.lee@austinisd.org')).toBe('teacher');
  });

  it('maps BHE emails to committee', () => {
    expect(roleForEmail('alex@bheeagles.com')).toBe('committee');
  });

  it('maps the treasurer address to admin', () => {
    expect(roleForEmail('treasurer@bheeagles.com')).toBe('admin');
  });

  it('maps the principal address to principal, not teacher', () => {
    expect(roleForEmail('kathryn.achtermann@austinisd.org')).toBe('principal');
  });

  it('persists principal as committee until the users.role check allows principal', () => {
    expect(persistableRole('principal')).toBe('committee');
    expect(persistableRole('teacher')).toBe('teacher');
  });

  it('treats the seeded principal email as principal even if stored as committee', () => {
    expect(displayRole('kathryn.achtermann@austinisd.org', 'committee')).toBe('principal');
    expect(displayRole('jordan.lee@austinisd.org', 'teacher')).toBe('teacher');
  });

  it('maps other emails to committee', () => {
    expect(roleForEmail('someone@gmail.com')).toBe('committee');
    expect(roleForEmail('parent@bheeagles.com')).toBe('committee');
  });

  it('rejects a string that is not an email', () => {
    expect(roleForEmail('not-an-email')).toBeNull();
    expect(roleForEmail('kayluhb@')).toBeNull();
  });
});

describe('nameFromEmail', () => {
  it('turns a dotted local part into a display name', () => {
    expect(nameFromEmail('jordan.lee@austinisd.org')).toBe('Jordan Lee');
  });
});
