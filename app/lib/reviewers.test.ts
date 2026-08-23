import {describe, expect, it} from 'vitest';
import {requiredVoterIds, validateReviewerRoster} from '~/lib/reviewers';

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

  it('requires all three officers', () => {
    expect(validateReviewerRoster({...roster, chairmanUserId: ''})).toBe(
      'Pick a treasurer, principal, and chairman.',
    );
  });

  it('requires at least one committee reviewer', () => {
    expect(validateReviewerRoster({...roster, committeeUserIds: []})).toBe(
      'Add at least one committee reviewer.',
    );
  });

  it('rejects overlapping officer seats', () => {
    expect(validateReviewerRoster({...roster, chairmanUserId: 'treasurer'})).toBe(
      'Treasurer, principal, and chairman must be different people.',
    );
  });

  it('rejects officers listed on the committee', () => {
    expect(validateReviewerRoster({...roster, committeeUserIds: ['treasurer']})).toBe(
      'Committee reviewers cannot also hold an officer seat.',
    );
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
