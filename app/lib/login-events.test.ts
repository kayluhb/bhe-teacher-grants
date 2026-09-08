import {describe, expect, it} from 'vitest';
import {LOGIN_EVENT_KINDS, loginEventLabel} from '~/lib/login-events';

describe('loginEventLabel', () => {
  it('labels each known kind', () => {
    expect(loginEventLabel('otp_sent')).toBe('Code sent');
    expect(loginEventLabel('otp_failed')).toBe('Wrong code');
    expect(loginEventLabel('otp_success')).toBe('Signed in');
    expect(loginEventLabel('otp_locked')).toBe('Too many attempts');
  });

  it('covers every kind constant', () => {
    for (const kind of LOGIN_EVENT_KINDS) {
      expect(loginEventLabel(kind).length).toBeGreaterThan(0);
    }
  });
});
