import {env} from 'cloudflare:workers';
import {createSession} from '~/lib/auth';
import {getDb, newId} from '~/lib/db';
import {sendEmail} from '~/lib/email';
import {
  canCreateUserFromEmail,
  displayRole,
  nameFromEmail,
  normalizeEmail,
  persistableRole,
  roleForEmail,
  UNKNOWN_LOGIN_EMAIL_ERROR,
} from '~/lib/login-email';
import {recordLoginEvent} from '~/lib/login-events';
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

const userIdForEmail = async (email: string): Promise<string | null> => {
  const row = await getDb()
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{id: string}>();
  return row?.id ?? null;
};

export const requestOtp = async (rawEmail: string): Promise<OtpRequestResult> => {
  const email = normalizeEmail(rawEmail);
  if (!roleForEmail(email)) {
    return {error: 'Enter a valid email address.'};
  }

  if (!canCreateUserFromEmail(email)) {
    const rostered = await getDb()
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first<{id: string}>();
    if (!rostered) return {error: UNKNOWN_LOGIN_EMAIL_ERROR};
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

  await recordLoginEvent(getDb(), {
    email,
    kind: 'otp_sent',
    userId: await userIdForEmail(email),
  });

  return {cooldownSeconds: cooldownSeconds(OTP_COOLDOWN_MS), ok: true};
};

const upsertUser = async (email: string): Promise<{error: string} | {id: string}> => {
  const db = getDb();
  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{id: string}>();
  if (existing) return {id: existing.id};

  if (!canCreateUserFromEmail(email)) return {error: UNKNOWN_LOGIN_EMAIL_ERROR};
  const role = roleForEmail(email);
  if (!role) return {error: 'Enter a valid email address.'};
  const userId = newId();
  await db
    .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
    .bind(userId, email, nameFromEmail(email), persistableRole(role))
    .run();
  return {id: userId};
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
    await recordLoginEvent(getDb(), {
      email,
      kind: 'otp_locked',
      userId: await userIdForEmail(email),
    });
    return {error: 'Too many attempts. Request a new code after the cooldown.'};
  }

  const matches = hashesMatch(row.code_hash, await hashOtp(email, code));
  if (!matches) {
    const attempts = row.attempts + 1;
    await getDb()
      .prepare('UPDATE login_otps SET attempts = attempts + 1 WHERE email = ?')
      .bind(email)
      .run();
    const userId = await userIdForEmail(email);
    await recordLoginEvent(getDb(), {email, kind: 'otp_failed', userId});
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await recordLoginEvent(getDb(), {email, kind: 'otp_locked', userId});
    }
    return {error: 'That code is incorrect.'};
  }

  const user = await upsertUser(email);
  if ('error' in user) return user;
  await getDb().batch([
    getDb().prepare('DELETE FROM login_otps WHERE email = ?').bind(email),
    getDb()
      .prepare(`UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), new Date().toISOString(), user.id),
  ]);
  await recordLoginEvent(getDb(), {email, kind: 'otp_success', userId: user.id});
  await createSession(user.id);
  const userRow = await getDb()
    .prepare('SELECT email, role FROM users WHERE id = ?')
    .bind(user.id)
    .first<{email: string; role: string}>();
  return {
    ok: true,
    role: displayRole(userRow?.email ?? email, normalizeRole(userRow?.role || '') ?? 'teacher'),
  };
};
