import {describe, expect, it} from 'vitest';
import {
  OTP_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_WINDOW_MS,
  remainingCooldownMs,
  remainingHourlyCooldownMs,
} from '~/lib/otp';

describe('remainingCooldownMs', () => {
  it('is the full cooldown when a code was just sent', () => {
    expect(remainingCooldownMs(1_000, 1_000)).toBe(OTP_COOLDOWN_MS);
  });

  it('counts down until the cooldown elapses', () => {
    expect(remainingCooldownMs(1_000, 1_000 + 15_000)).toBe(OTP_COOLDOWN_MS - 15_000);
  });

  it('is zero after the cooldown', () => {
    expect(remainingCooldownMs(1_000, 1_000 + OTP_COOLDOWN_MS)).toBe(0);
  });
});

describe('remainingHourlyCooldownMs', () => {
  it('blocks more sends after the hourly cap', () => {
    expect(
      remainingHourlyCooldownMs({
        nowMs: 1_000 + OTP_WINDOW_MS - 5_000,
        sendCount: OTP_MAX_SENDS_PER_HOUR,
        windowStartedAtMs: 1_000,
      }),
    ).toBe(5_000);
  });

  it('allows sends under the hourly cap', () => {
    expect(
      remainingHourlyCooldownMs({
        nowMs: 2_000,
        sendCount: OTP_MAX_SENDS_PER_HOUR - 1,
        windowStartedAtMs: 1_000,
      }),
    ).toBe(0);
  });
});
