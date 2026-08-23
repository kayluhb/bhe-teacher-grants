export const OTP_COOLDOWN_MS = 60_000;
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_WINDOW_MS = 60 * 60_000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;

export const remainingCooldownMs = (
  lastSentAtMs: number,
  nowMs: number,
  cooldownMs = OTP_COOLDOWN_MS,
): number => Math.max(0, lastSentAtMs + cooldownMs - nowMs);

export const remainingHourlyCooldownMs = (input: {
  nowMs: number;
  sendCount: number;
  windowStartedAtMs: number;
}): number => {
  const windowEndsAt = input.windowStartedAtMs + OTP_WINDOW_MS;
  if (input.nowMs >= windowEndsAt) return 0;
  if (input.sendCount < OTP_MAX_SENDS_PER_HOUR) return 0;
  return windowEndsAt - input.nowMs;
};

export const cooldownSeconds = (remainingMs: number): number => Math.ceil(remainingMs / 1000);

export const generateOtp = (): string => {
  const bytes = new Uint32Array(1);
  const limit = 4_294_000_000;
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= limit);
  return String(bytes[0] % 1_000_000).padStart(6, '0');
};
