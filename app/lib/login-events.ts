export const LOGIN_EVENT_KINDS = ['otp_sent', 'otp_failed', 'otp_success', 'otp_locked'] as const;

export type LoginEventKind = (typeof LOGIN_EVENT_KINDS)[number];

export type LoginEventRow = {
  created_at: string;
  email: string;
  id: string;
  kind: LoginEventKind;
  user_id: string | null;
};

const LOGIN_EVENT_LABELS: Record<LoginEventKind, string> = {
  otp_failed: 'Wrong code',
  otp_locked: 'Too many attempts',
  otp_sent: 'Code sent',
  otp_success: 'Signed in',
};

export const loginEventLabel = (kind: LoginEventKind): string => LOGIN_EVENT_LABELS[kind];

const newEventId = (): string => crypto.randomUUID().replaceAll('-', '');

export const recordLoginEvent = async (
  db: D1Database,
  input: {email: string; kind: LoginEventKind; userId?: string | null},
): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO login_events (id, email, user_id, kind, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(newEventId(), input.email, input.userId ?? null, input.kind, new Date().toISOString())
    .run();
};

export const listLoginEventsForEmail = async (
  db: D1Database,
  email: string,
  limit = 20,
): Promise<LoginEventRow[]> => {
  const rows = await db
    .prepare(
      `SELECT id, email, user_id, kind, created_at
       FROM login_events
       WHERE email = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(email, limit)
    .all<LoginEventRow>();
  return rows.results ?? [];
};
