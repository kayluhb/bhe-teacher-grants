import {
  isLockedRosterEmail,
  nameFromEmail,
  normalizeEmail,
  persistableRole,
  roleForEmail,
} from '~/lib/login-email';
import type {Role} from '~/lib/roles';
import type {Result} from '~/lib/types';

export type DirectoryPerson = {
  email: string;
  id: string;
  name: string;
};

export const matchPeople = (people: DirectoryPerson[], query: string): DirectoryPerson[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return people.filter(
    (person) =>
      person.name.toLowerCase().includes(needle) || person.email.toLowerCase().includes(needle),
  );
};

export const draftUserFromEmail = (
  raw: string,
): Result<{email: string; name: string; role: Role}> => {
  const email = normalizeEmail(raw);
  const role = roleForEmail(email);
  if (!role) return {error: 'Enter a valid email address.'};
  if (isLockedRosterEmail(email)) {
    return {error: 'Committee reviewers cannot also hold an officer seat.'};
  }
  return {email, name: nameFromEmail(email), role: persistableRole(role)};
};

export const createEmailFromQuery = (query: string, people: DirectoryPerson[]): string | null => {
  const draft = draftUserFromEmail(query);
  if ('error' in draft) return null;
  if (people.some((person) => normalizeEmail(person.email) === draft.email)) return null;
  return draft.email;
};

export type PersonSuggestion =
  | {email: string; kind: 'create'}
  | {kind: 'draft'; name: string}
  | {kind: 'invalid'; message: string}
  | {kind: 'person'; person: DirectoryPerson};

export const suggestPeople = (
  people: DirectoryPerson[],
  query: string,
  takenIds: readonly string[] = [],
): PersonSuggestion[] => {
  const taken = new Set(takenIds);
  const matches = matchPeople(
    people.filter((person) => !taken.has(person.id)),
    query,
  );
  const rows: PersonSuggestion[] = matches.map((person) => ({kind: 'person', person}));
  const trimmed = query.trim();
  if (!trimmed) return rows;

  const createEmail = createEmailFromQuery(query, people);
  if (createEmail) {
    rows.push({email: createEmail, kind: 'create'});
    return rows;
  }

  if (trimmed.includes('@')) {
    const draft = draftUserFromEmail(trimmed);
    if ('error' in draft) rows.push({kind: 'invalid', message: draft.error});
    return rows;
  }

  rows.push({kind: 'draft', name: trimmed});
  return rows;
};

export const committeeAddError = (
  userId: string,
  officerIds: string[],
  _committeeIds: string[],
): string | null => {
  if (officerIds.includes(userId)) {
    return 'Committee reviewers cannot also hold an officer seat.';
  }
  return null;
};

export const committeeRemoveError = (remainingCommitteeCount: number): string | null =>
  remainingCommitteeCount < 1 ? 'Add at least one committee reviewer.' : null;

export const parseUserName = (raw: string): Result<{name: string}> => {
  const name = raw.trim();
  if (!name) return {error: 'Name is required.'};
  return {name};
};

export const resolvedPersonName = (email: string, name?: string): Result<{name: string}> => {
  if (name?.trim()) return parseUserName(name);
  const draft = draftUserFromEmail(email);
  if ('error' in draft) return draft;
  return {name: draft.name};
};

export const composeDraftFromSuggestion = (
  suggestion: Extract<PersonSuggestion, {kind: 'create'} | {kind: 'draft'}>,
): {email: string; name: string} => {
  if (suggestion.kind === 'draft') return {email: '', name: suggestion.name};
  const draft = draftUserFromEmail(suggestion.email);
  return {
    email: suggestion.email,
    name: 'error' in draft ? '' : draft.name,
  };
};
