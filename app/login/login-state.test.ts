import {describe, expect, it} from 'vitest';
import {latestLoginState} from '~/login/login-state';

describe('latestLoginState', () => {
  it('hides a failed-code error after a newer resend', () => {
    const failedCode = {
      at: 1,
      email: 'maya@austinisd.org',
      error: 'That code is incorrect.',
      step: 'code' as const,
    };
    const resent = {at: 2, cooldownSeconds: 60, email: 'maya@austinisd.org', step: 'code' as const};

    expect(latestLoginState(resent, failedCode).error).toBeUndefined();
  });

  it('keeps a failed-code error until something newer replaces it', () => {
    const sent = {at: 1, cooldownSeconds: 60, email: 'maya@austinisd.org', step: 'code' as const};
    const failedCode = {
      at: 2,
      email: 'maya@austinisd.org',
      error: 'That code is incorrect.',
      step: 'code' as const,
    };

    expect(latestLoginState(sent, failedCode).error).toBe('That code is incorrect.');
  });

  it('shows the newer send-code error after a previous verify failure', () => {
    expect(
      latestLoginState(
        {
          at: 2,
          email: 'maya@austinisd.org',
          error: 'Wait 60 seconds before requesting another code.',
          step: 'code',
        },
        {at: 1, email: 'maya@austinisd.org', error: 'That code is incorrect.', step: 'code'},
      ).error,
    ).toBe('Wait 60 seconds before requesting another code.');
  });
});
