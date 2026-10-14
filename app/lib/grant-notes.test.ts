import {describe, expect, it} from 'vitest';
import {canAuthorGrantNote, canMutateGrantNote, validateNoteBody} from '~/lib/grant-notes';

describe('canAuthorGrantNote', () => {
  it('allows admins', () => {
    expect(canAuthorGrantNote({id: 'admin', role: 'admin'}, 'chair-user')).toBe(true);
  });

  it('allows the chair role', () => {
    expect(canAuthorGrantNote({id: 'anyone', role: 'chair'}, 'chair-user')).toBe(true);
  });

  it('allows the seated chairman', () => {
    expect(canAuthorGrantNote({id: 'chair-user', role: 'committee'}, 'chair-user')).toBe(true);
  });

  it('rejects ordinary reviewers', () => {
    expect(canAuthorGrantNote({id: 'committee', role: 'committee'}, 'chair-user')).toBe(false);
    expect(canAuthorGrantNote({id: 'teacher', role: 'teacher'}, 'chair-user')).toBe(false);
  });
});

describe('canMutateGrantNote', () => {
  it('allows the note author', () => {
    expect(canMutateGrantNote({id: 'author', role: 'committee'}, 'author', 'chair-user')).toBe(
      true,
    );
  });

  it('allows any chair or admin to edit another author note', () => {
    expect(canMutateGrantNote({id: 'admin', role: 'admin'}, 'author', 'chair-user')).toBe(true);
    expect(canMutateGrantNote({id: 'chair-user', role: 'chair'}, 'author', 'chair-user')).toBe(
      true,
    );
  });

  it('rejects other reviewers', () => {
    expect(canMutateGrantNote({id: 'other', role: 'committee'}, 'author', 'chair-user')).toBe(
      false,
    );
  });
});

describe('validateNoteBody', () => {
  it('rejects empty or whitespace-only bodies', () => {
    expect(validateNoteBody('')).toEqual({error: 'Enter a note.'});
    expect(validateNoteBody('   ')).toEqual({error: 'Enter a note.'});
  });

  it('returns the trimmed body when valid', () => {
    expect(validateNoteBody('  portable, not fixed  ')).toEqual({
      body: 'portable, not fixed',
    });
  });
});
