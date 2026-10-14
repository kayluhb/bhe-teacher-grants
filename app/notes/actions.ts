'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {
  canAuthorGrantNote,
  canMutateGrantNote,
  createGrantNote,
  deleteGrantNote,
  getGrantNote,
  updateGrantNote,
} from '~/lib/grant-notes';
import {getGrant, listReviewerRows} from '~/lib/grants';

const seatedChairmanId = async (db: D1Database, cycleId: string) => {
  const rows = await listReviewerRows(db, cycleId);
  return rows.find((row) => row.seat === 'chairman')?.userId ?? null;
};

const revalidateGrantNotes = (grantId: string) => {
  revalidatePath(`/review/${grantId}`);
  revalidatePath(`/chair/${grantId}`);
};

export const createGrantNoteAction = async (formData: FormData) => {
  const user = await requireAuth();
  const grantId = String(formData.get('grant_id') || '');
  const db = getDb();
  const grant = await getGrant(db, grantId);
  if (!grant || grant.status === 'DRAFT') return {error: 'Grant not found.'};

  const chairmanId = await seatedChairmanId(db, grant.cycle_id);
  if (!canAuthorGrantNote(user, chairmanId)) {
    return {error: 'Only chairs and admins can add notes.'};
  }

  const result = await createGrantNote(db, {
    authorId: user.id,
    body: String(formData.get('body') || ''),
    grantId,
  });
  if ('error' in result) return result;

  revalidateGrantNotes(grantId);
  return {ok: true as const};
};

export const updateGrantNoteAction = async (formData: FormData) => {
  const user = await requireAuth();
  const noteId = String(formData.get('note_id') || '');
  const db = getDb();
  const note = await getGrantNote(db, noteId);
  if (!note) return {error: 'Note not found.'};

  const grant = await getGrant(db, note.grant_id);
  if (!grant) return {error: 'Grant not found.'};

  const chairmanId = await seatedChairmanId(db, grant.cycle_id);
  if (!canMutateGrantNote(user, note.author_id, chairmanId)) {
    return {error: 'You cannot edit this note.'};
  }

  const result = await updateGrantNote(db, {
    body: String(formData.get('body') || ''),
    noteId,
  });
  if ('error' in result) return result;

  revalidateGrantNotes(note.grant_id);
  return {ok: true as const};
};

export const deleteGrantNoteAction = async (formData: FormData) => {
  const user = await requireAuth();
  const noteId = String(formData.get('note_id') || '');
  const db = getDb();
  const note = await getGrantNote(db, noteId);
  if (!note) return {error: 'Note not found.'};

  const grant = await getGrant(db, note.grant_id);
  if (!grant) return {error: 'Grant not found.'};

  const chairmanId = await seatedChairmanId(db, grant.cycle_id);
  if (!canMutateGrantNote(user, note.author_id, chairmanId)) {
    return {error: 'You cannot delete this note.'};
  }

  const result = await deleteGrantNote(db, noteId);
  if ('error' in result) return result;

  revalidateGrantNotes(note.grant_id);
  return {ok: true as const};
};
