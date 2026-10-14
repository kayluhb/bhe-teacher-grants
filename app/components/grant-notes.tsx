'use client';

import {useState} from 'react';
import {formatSchoolCompactDateTime} from '~/lib/grant-cycle';
import type {GrantNoteRow} from '~/lib/grant-notes';
import {createGrantNoteAction, deleteGrantNoteAction, updateGrantNoteAction} from '~/notes/actions';

type NoteView = Pick<
  GrantNoteRow,
  'author_id' | 'author_name' | 'body' | 'created_at' | 'id' | 'updated_at'
>;

export const GrantNotes = ({
  canAuthor,
  currentUserId,
  grantId,
  mutableNoteIds,
  notes,
}: {
  canAuthor: boolean;
  currentUserId: string;
  grantId: string;
  mutableNoteIds: string[];
  notes: NoteView[];
}) => {
  const mutable = new Set(mutableNoteIds);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading font-semibold text-charcoal">Reviewer notes</h2>
        <p className="text-sm text-gray-600">
          Visible to reviewers and chairs. Teachers do not see these notes.
        </p>
      </div>

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
          No notes yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard
                canMutate={mutable.has(note.id)}
                currentUserId={currentUserId}
                note={note}
              />
            </li>
          ))}
        </ul>
      )}

      {canAuthor ? <NoteComposer grantId={grantId} /> : null}
    </section>
  );
};

const NoteComposer = ({grantId}: {grantId: string}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    try {
      const result = await createGrantNoteAction(new FormData(form));
      if (result && 'error' in result) {
        setError(result.error);
        return;
      }
      form.reset();
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-2 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <label className="font-body block text-sm text-charcoal">
        Add a note
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
          name="body"
          placeholder="Context for other reviewers…"
          required
          rows={3}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-brand" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Add note'}
      </button>
    </form>
  );
};

const NoteCard = ({
  canMutate,
  currentUserId,
  note,
}: {
  canMutate: boolean;
  currentUserId: string;
  note: NoteView;
}) => {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const edited = note.updated_at !== note.created_at;

  const onUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await updateGrantNoteAction(new FormData(event.currentTarget));
      if (result && 'error' in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
    } finally {
      setPending(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this note?')) return;
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('note_id', note.id);
      const result = await deleteGrantNoteAction(formData);
      if (result && 'error' in result) setError(result.error);
    } finally {
      setPending(false);
    }
  };

  if (editing) {
    return (
      <form
        className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-3"
        onSubmit={onUpdate}
      >
        <input name="note_id" type="hidden" value={note.id} />
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
          defaultValue={note.body}
          name="body"
          required
          rows={3}
        />
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-brand" disabled={pending} type="submit">
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            className="btn btn-secondary"
            disabled={pending}
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-charcoal">
          {note.author_name}
          {note.author_id === currentUserId ? (
            <span className="ml-1 font-normal text-gray-500">(you)</span>
          ) : null}
        </p>
        <p className="text-xs text-gray-500">
          {formatSchoolCompactDateTime(note.created_at)}
          {edited ? ' · edited' : null}
        </p>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-gray-700">{note.body}</p>
      {canMutate ? (
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            className="text-sm font-medium text-eagle-blue hover:underline"
            disabled={pending}
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </button>
          <button
            className="text-sm font-medium text-red-700 hover:underline"
            disabled={pending}
            onClick={onDelete}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-1 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
};
