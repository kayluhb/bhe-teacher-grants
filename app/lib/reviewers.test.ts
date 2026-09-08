import {describe, expect, it} from 'vitest';
import {requiredVoterIds, rosterAssignments, validateReviewerRoster} from '~/lib/reviewers';

describe('validateReviewerRoster', () => {
  const roster = {
    chairmanUserId: 'chair',
    committeeUserIds: ['committee-a', 'teacher'],
    principalUserId: 'principal',
    treasurerUserId: 'treasurer',
  };

  it('accepts distinct officers plus committee', () => {
    expect(validateReviewerRoster(roster)).toBeNull();
  });

  it('accepts an empty roster', () => {
    expect(
      validateReviewerRoster({
        chairmanUserId: '',
        committeeUserIds: [],
        principalUserId: '',
        treasurerUserId: '',
      }),
    ).toBeNull();
  });

  it('accepts a partial roster', () => {
    expect(validateReviewerRoster({...roster, chairmanUserId: '', committeeUserIds: []})).toBeNull();
  });

  it('rejects overlapping officer seats', () => {
    expect(validateReviewerRoster({...roster, chairmanUserId: 'treasurer'})).toBe(
      'Treasurer, principal, and chairman must be different people.',
    );
  });

  it('rejects overlapping seats when only some officers are set', () => {
    expect(
      validateReviewerRoster({
        ...roster,
        chairmanUserId: 'treasurer',
        principalUserId: '',
        committeeUserIds: [],
      }),
    ).toBe('Treasurer, principal, and chairman must be different people.');
  });

  it('rejects officers listed on the committee', () => {
    expect(validateReviewerRoster({...roster, committeeUserIds: ['treasurer']})).toBe(
      'Committee reviewers cannot also hold an officer seat.',
    );
  });
});

describe('rosterAssignments', () => {
  it('omits empty officer seats', () => {
    expect(
      rosterAssignments({
        chairmanUserId: 'chair',
        committeeUserIds: ['committee-a', ''],
        principalUserId: '',
        treasurerUserId: 'treasurer',
      }),
    ).toEqual([
      {seat: 'treasurer', userId: 'treasurer'},
      {seat: 'chairman', userId: 'chair'},
      {seat: 'committee', userId: 'committee-a'},
    ]);
  });

  it('returns no rows for an empty roster', () => {
    expect(
      rosterAssignments({
        chairmanUserId: '',
        committeeUserIds: [],
        principalUserId: '',
        treasurerUserId: '',
      }),
    ).toEqual([]);
  });
});

describe('requiredVoterIds', () => {
  const reviewers = [
    {seat: 'treasurer' as const, userId: 'treasurer'},
    {seat: 'principal' as const, userId: 'principal'},
    {seat: 'chairman' as const, userId: 'chair'},
    {seat: 'committee' as const, userId: 'committee-a'},
    {seat: 'committee' as const, userId: 'teacher'},
  ];

  it('excludes the chairman and the submitting teacher', () => {
    expect(requiredVoterIds(reviewers, 'teacher')).toEqual([
      'treasurer',
      'principal',
      'committee-a',
    ]);
  });

  it('keeps a teacher-reviewer when they did not submit the grant', () => {
    expect(requiredVoterIds(reviewers, 'other-teacher')).toEqual([
      'treasurer',
      'principal',
      'committee-a',
      'teacher',
    ]);
  });
});
