import {describe, expect, it} from 'vitest';
import {AISD_DOMAIN} from '~/lib/login-email';
import {
  committeeAddError,
  committeeRemoveError,
  composeDraftFromSuggestion,
  createEmailFromQuery,
  draftUserFromEmail,
  matchPeople,
  parseRosterUserInput,
  parseUserName,
  resolvedPersonName,
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

  it('offers create for a Gmail address', () => {
    expect(suggestPeople(directory, 'kayluhb@gmail.com')).toEqual([
      {kind: 'create', email: 'kayluhb@gmail.com'},
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

  it('drafts any other email as committee', () => {
    expect(draftUserFromEmail('parent@gmail.com')).toEqual({
      email: 'parent@gmail.com',
      name: 'Parent',
      role: 'committee',
    });
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

describe('parseRosterUserInput', () => {
  it('accepts an AISD teacher with a name', () => {
    expect(parseRosterUserInput({email: 'maya.chen@austinisd.org', name: 'Maya Chen'})).toEqual({
      email: 'maya.chen@austinisd.org',
      name: 'Maya Chen',
    });
  });

  it('accepts a personal email as a committee member', () => {
    expect(parseRosterUserInput({email: 'parent@gmail.com', name: 'Alex Parent'})).toEqual({
      email: 'parent@gmail.com',
      name: 'Alex Parent',
    });
  });

  it('rejects a blank name', () => {
    expect(parseRosterUserInput({email: 'maya.chen@austinisd.org', name: '  '})).toEqual({
      error: 'Name is required.',
    });
  });

  it('rejects an invalid email', () => {
    expect(parseRosterUserInput({email: 'not-an-email', name: 'Maya Chen'})).toEqual({
      error: 'Enter a valid email address.',
    });
  });
});

describe('parseUserName', () => {
  it('rejects a blank name', () => {
    expect(parseUserName('')).toEqual({error: 'Name is required.'});
  });

  it('rejects a whitespace-only name', () => {
    expect(parseUserName('   ')).toEqual({error: 'Name is required.'});
  });

  it('trims a valid name', () => {
    expect(parseUserName('  Caleb Brown  ')).toEqual({name: 'Caleb Brown'});
  });
});

describe('resolvedPersonName', () => {
  it('stores the typed name instead of the email local part', () => {
    expect(resolvedPersonName('kayluhb@gmail.com', 'Caleb Brown')).toEqual({name: 'Caleb Brown'});
  });

  it('falls back to the email local part when no name is given', () => {
    expect(resolvedPersonName('kayluhb@gmail.com')).toEqual({name: 'Kayluhb'});
  });
});

describe('composeDraftFromSuggestion', () => {
  it('prefills the email when adding from an email query', () => {
    expect(composeDraftFromSuggestion({email: 'kayluhb@gmail.com', kind: 'create'})).toEqual({
      email: 'kayluhb@gmail.com',
      name: 'Kayluhb',
    });
  });

  it('prefills the name when adding from a name query', () => {
    expect(composeDraftFromSuggestion({kind: 'draft', name: 'Caleb Brown'})).toEqual({
      email: '',
      name: 'Caleb Brown',
    });
  });
});
