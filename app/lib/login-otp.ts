import {env} from 'cloudflare:workers';
import {createSession} from '~/lib/auth';
import {getDb, newId} from '~/lib/db';
import {sendEmail} from '~/lib/email';
import {
  displayRole,
  nameFromEmail,
  normalizeEmail,
  persistableRole,
  roleForEmail,
} from '~/lib/login-email';
import {
  cooldownSeconds,
  generateOtp,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  OTP_WINDOW_MS,
  remainingCooldownMs,
  remainingHourlyCooldownMs,
} from '~/lib/otp';
import {normalizeRole, type Role} from '~/lib/roles';

type OtpRow = {
  attempts: number;
  code_hash: string;
  email: string;
  expires_at: number;
  send_count: number;
  sent_at: number;
  window_started_at: number;
};

export type OtpRequestResult =
  | {cooldownSeconds?: number; error: string}
  | {cooldownSeconds: number; ok: true};

export type OtpVerifyResult = {error: string} | {ok: true; role: Role};

const hashOtp = async (email: string, code: string): Promise<string> => {
  const payload = new TextEncoder().encode(`${env.SESSION_SECRET}:${email}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const hashesMatch = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let mismatch = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    mismatch |= leftBytes[index] ^ rightBytes[index];
  }
  return mismatch === 0;
};

const loadOtp = async (email: string) =>
  getDb().prepare('SELECT * FROM login_otps WHERE email = ?').bind(email).first<OtpRow>();

export const requestOtp = async (rawEmail: string): Promise<OtpRequestResult> => {
  const email = normalizeEmail(rawEmail);
  if (!roleForEmail(email)) {
    return {error: 'Use your AISD (@austinisd.org) or BHE PTA (@bheeagles.com) email.'};
  }

  const now = Date.now();
  const existing = await loadOtp(email);
  if (existing) {
    const shortCooldown = remainingCooldownMs(existing.sent_at, now);
    if (shortCooldown > 0) {
      return {
        cooldownSeconds: cooldownSeconds(shortCooldown),
        error: `Wait ${cooldownSeconds(shortCooldown)}s before requesting another code.`,
      };
    }

    const windowStartedAt =
      now - existing.window_started_at >= OTP_WINDOW_MS ? now : existing.window_started_at;
    const sendCount = windowStartedAt === existing.window_started_at ? existing.send_count : 0;
    const hourlyCooldown = remainingHourlyCooldownMs({
      nowMs: now,
      sendCount,
      windowStartedAtMs: windowStartedAt,
    });
    if (hourlyCooldown > 0) {
      return {
        cooldownSeconds: cooldownSeconds(hourlyCooldown),
        error: `Too many codes. Try again in ${cooldownSeconds(hourlyCooldown)}s.`,
      };
    }
  }

  const code = generateOtp();
  const sent = await sendEmail({
    html: `<p>Your Barton Hills teacher grants sign-in code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore the email.</p>`,
    subject: `${code} is your grant portal code`,
    to: email,
  });
  if (!sent) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[otp] ${email} ${code}`);
    } else {
      return {error: 'Could not send a sign-in code. Try again in a minute.'};
    }
  }

  const windowStartedAt =
    existing && now - existing.window_started_at < OTP_WINDOW_MS ? existing.window_started_at : now;
  const sendCount =
    existing && now - existing.window_started_at < OTP_WINDOW_MS ? existing.send_count + 1 : 1;

  await getDb()
    .prepare(
      `INSERT INTO login_otps (email, code_hash, sent_at, expires_at, attempts, send_count, window_started_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         code_hash = excluded.code_hash,
         sent_at = excluded.sent_at,
         expires_at = excluded.expires_at,
         attempts = 0,
         send_count = excluded.send_count,
         window_started_at = excluded.window_started_at`,
    )
    .bind(email, await hashOtp(email, code), now, now + OTP_TTL_MS, sendCount, windowStartedAt)
    .run();

  return {cooldownSeconds: cooldownSeconds(OTP_COOLDOWN_MS), ok: true};
};

const upsertUser = async (email: string): Promise<string> => {
  const db = getDb();
  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{id: string}>();
  if (existing) return existing.id;

  const userId = newId();
  const role = roleForEmail(email);
  if (!role) throw new Error('Unsupported email domain');
  await db
    .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
    .bind(userId, email, nameFromEmail(email), persistableRole(role))
    .run();
  return userId;
};

export const verifyOtp = async (rawEmail: string, rawCode: string): Promise<OtpVerifyResult> => {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) return {error: 'Enter the 6-digit code from your email.'};

  const row = await loadOtp(email);
  if (!row) return {error: 'Request a new code.'};

  const now = Date.now();
  if (row.expires_at <= now) return {error: 'That code expired. Request a new one.'};
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return {error: 'Too many attempts. Request a new code after the cooldown.'};
  }

  const matches = hashesMatch(row.code_hash, await hashOtp(email, code));
  if (!matches) {
    await getDb()
      .prepare('UPDATE login_otps SET attempts = attempts + 1 WHERE email = ?')
      .bind(email)
      .run();
    return {error: 'That code is incorrect.'};
  }

  await getDb().prepare('DELETE FROM login_otps WHERE email = ?').bind(email).run();
  const userId = await upsertUser(email);
  await createSession(userId);
  const userRow = await getDb()
    .prepare('SELECT email, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{email: string; role: string}>();
  return {
    ok: true,
    role: displayRole(userRow?.email ?? email, normalizeRole(userRow?.role || '') ?? 'teacher'),
  };
};
