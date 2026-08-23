import {describe, expect, it} from 'vitest';
import {AISD_DOMAIN} from '~/lib/login-email';
import {
  committeeAddError,
  committeeRemoveError,
  createEmailFromQuery,
  draftUserFromEmail,
  matchPeople,
  suggestPeople,
} from '~/lib/people';

const directory = [
  {email: 'sam.patel@bheeagles.com', id: 'committee-a', name: 'Sam Patel'},
  {email: `jordan.lee@${AISD_DOMAIN}`, id: 'teacher', name: 'Jordan Lee'},
  {email: 'chair@bheeagles.com', id: 'chair', name: 'Chris Hall'},
];

describe('matchPeople', () => {
  it('matches a name fragment', () => {
    expect(matchPeople(directory, 'patel').map((row) => row.id)).toEqual(['committee-a']);
  });

  it('matches an email fragment, case-insensitively', () => {
    expect(matchPeople(directory, 'JORDAN.LEE').map((row) => row.id)).toEqual(['teacher']);
  });

  it('returns nothing until the query has a character', () => {
    expect(matchPeople(directory, '  ')).toEqual([]);
  });
});

describe('createEmailFromQuery', () => {
  it('offers a new valid email that is not already in the directory', () => {
    expect(createEmailFromQuery('Alex@bheeagles.com', directory)).toBe('alex@bheeagles.com');
  });

  it('does not offer create when that email already exists', () => {
    expect(createEmailFromQuery('sam.patel@bheeagles.com', directory)).toBeNull();
  });

  it('does not offer create for a name-only query', () => {
    expect(createEmailFromQuery('Sam', directory)).toBeNull();
  });
});

describe('suggestPeople', () => {
  it('offers a draft person when the query is a name', () => {
    expect(suggestPeople(directory, 'kayluhb')).toEqual([{kind: 'draft', name: 'kayluhb'}]);
  });

  it('keeps name matches and still offers creating that name', () => {
    expect(suggestPeople(directory, 'Sam')).toEqual([
      {kind: 'person', person: directory[0]},
      {kind: 'draft', name: 'Sam'},
    ]);
  });

  it('offers create for a new valid email', () => {
    expect(suggestPeople(directory, 'Alex@bheeagles.com')).toEqual([
      {kind: 'create', email: 'alex@bheeagles.com'},
    ]);
  });

  it('explains why an invalid email cannot be created', () => {
    expect(suggestPeople(directory, 'kayluhb@gmail.com')).toEqual([
      {kind: 'invalid', message: 'Enter a valid email address.'},
    ]);
  });

  it('does not offer create when that email is already in the directory', () => {
    expect(suggestPeople(directory, 'sam.patel@bheeagles.com')).toEqual([
      {kind: 'person', person: directory[0]},
    ]);
  });
});

describe('draftUserFromEmail', () => {
  it('drafts an AISD address as a teacher', () => {
    expect(draftUserFromEmail(`maya.chen@${AISD_DOMAIN}`)).toEqual({
      email: `maya.chen@${AISD_DOMAIN}`,
      name: 'Maya Chen',
      role: 'teacher',
    });
  });

  it('drafts a BHE address as committee', () => {
    expect(draftUserFromEmail('parent@bheeagles.com')).toEqual({
      email: 'parent@bheeagles.com',
      name: 'Parent',
      role: 'committee',
    });
  });

  it('rejects an address outside AISD or BHE', () => {
    expect(draftUserFromEmail('parent@gmail.com')).toEqual({error: 'Enter a valid email address.'});
  });

  it('rejects an invalid address', () => {
    expect(draftUserFromEmail('not-an-email')).toEqual({error: 'Enter a valid email address.'});
  });

  it('rejects the treasurer and principal emails', () => {
    expect(draftUserFromEmail('treasurer@bheeagles.com')).toEqual({
      error: 'Committee reviewers cannot also hold an officer seat.',
    });
  });
});

describe('committeeAddError', () => {
  const officers = ['chair', 'principal', 'treasurer'];

  it('rejects an officer', () => {
    expect(committeeAddError('chair', officers, ['committee-a'])).toBe(
      'Committee reviewers cannot also hold an officer seat.',
    );
  });

  it('allows a teacher or new committee member', () => {
    expect(committeeAddError('teacher', officers, ['committee-a'])).toBeNull();
  });

  it('treats an existing committee member as fine', () => {
    expect(committeeAddError('committee-a', officers, ['committee-a'])).toBeNull();
  });
});

describe('committeeRemoveError', () => {
  it('blocks removing the last committee reviewer', () => {
    expect(committeeRemoveError(0)).toBe('Add at least one committee reviewer.');
  });

  it('allows removing when another reviewer remains', () => {
    expect(committeeRemoveError(1)).toBeNull();
  });
});
