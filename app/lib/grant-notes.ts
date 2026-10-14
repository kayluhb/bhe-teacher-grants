import type {Result} from '~/lib/types';
import {isChairActor} from '~/lib/votes';

const newNoteId = (): string => crypto.randomUUID().replaceAll('-', '');

export type GrantNoteRow = {
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  grant_id: string;
  id: string;
  updated_at: string;
};

export const canAuthorGrantNote = (
  actor: {id: string; role: string},
  seatedChairmanId: string | null | undefined,
) => actor.role === 'admin' || isChairActor(actor, seatedChairmanId);

export const canMutateGrantNote = (
  actor: {id: string; role: string},
  noteAuthorId: string,
  seatedChairmanId: string | null | undefined,
) => actor.id === noteAuthorId || canAuthorGrantNote(actor, seatedChairmanId);

export const validateNoteBody = (raw: string): Result<{body: string}> => {
  const body = raw.trim();
  if (!body) return {error: 'Enter a note.'};
  return {body};
};

export const listGrantNotes = async (db: D1Database, grantId: string) => {
  const rows = await db
    .prepare(
      `SELECT n.id, n.grant_id, n.author_id, n.body, n.created_at, n.updated_at, u.name AS author_name
       FROM grant_notes n
       JOIN users u ON u.id = n.author_id
       WHERE n.grant_id = ?
       ORDER BY n.created_at ASC`,
    )
    .bind(grantId)
    .all<GrantNoteRow>();
  return rows.results ?? [];
};

export const getGrantNote = async (db: D1Database, noteId: string) =>
  db
    .prepare(
      `SELECT n.id, n.grant_id, n.author_id, n.body, n.created_at, n.updated_at, u.name AS author_name
       FROM grant_notes n
       JOIN users u ON u.id = n.author_id
       WHERE n.id = ?`,
    )
    .bind(noteId)
    .first<GrantNoteRow>();

export const createGrantNote = async (
  db: D1Database,
  input: {authorId: string; body: string; grantId: string},
): Promise<Result<{id: string}>> => {
  const validated = validateNoteBody(input.body);
  if ('error' in validated) return validated;
  const id = newNoteId();
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO grant_notes (id, grant_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(id, input.grantId, input.authorId, validated.body, now, now)
    .run();
  return {id};
};

export const updateGrantNote = async (
  db: D1Database,
  input: {body: string; noteId: string},
): Promise<Result<{id: string}>> => {
  const validated = validateNoteBody(input.body);
  if ('error' in validated) return validated;
  const result = await db
    .prepare(
      `UPDATE grant_notes
       SET body = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(validated.body, new Date().toISOString(), input.noteId)
    .run();
  if (!result.meta.changes) return {error: 'Note not found.'};
  return {id: input.noteId};
};

export const deleteGrantNote = async (
  db: D1Database,
  noteId: string,
): Promise<Result<{id: string}>> => {
  const result = await db.prepare('DELETE FROM grant_notes WHERE id = ?').bind(noteId).run();
  if (!result.meta.changes) return {error: 'Note not found.'};
  return {id: noteId};
};
