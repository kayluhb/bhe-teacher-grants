import {describe, expect, it} from 'vitest';
import {tallyVotes, validateChairDecision} from '~/lib/votes';

const voters = ['treasurer', 'principal', 'committee'];

describe('tallyVotes', () => {
  it('stays incomplete until every required voter has a ballot', () => {
    const tally = tallyVotes([{vote: 'APPROVE', voterId: 'treasurer'}], voters, 'teacher');
    expect(tally.complete).toBe(false);
    expect(tally.notVoted).toBe(2);
  });

  it('is complete when every required voter has voted, including abstain', () => {
    const tally = tallyVotes(
      [
        {vote: 'APPROVE', voterId: 'treasurer'},
        {vote: 'REJECT', voterId: 'principal'},
        {vote: 'ABSTAIN', voterId: 'committee'},
      ],
      voters,
      'teacher',
    );
    expect(tally.complete).toBe(true);
    expect(tally.notVoted).toBe(0);
  });

  it('still reports an advisory majority without changing completeness', () => {
    const tally = tallyVotes(
      [
        {vote: 'APPROVE', voterId: 'treasurer'},
        {vote: 'APPROVE', voterId: 'principal'},
      ],
      voters,
      'teacher',
    );
    expect(tally.outcome).toBe('APPROVED');
    expect(tally.complete).toBe(false);
  });

  it('ignores the submitting teacher even if listed as eligible', () => {
    const tally = tallyVotes(
      [{vote: 'APPROVE', voterId: 'teacher'}],
      [...voters, 'teacher'],
      'teacher',
    );
    expect(tally.approve).toBe(0);
    expect(tally.complete).toBe(false);
  });
});

describe('validateChairDecision', () => {
  it('allows the chairman to decide once review is complete', () => {
    expect(
      validateChairDecision({complete: true, isChairman: true, reviewStarted: true}),
    ).toBeNull();
  });

  it('rejects a non-chairman', () => {
    expect(validateChairDecision({complete: true, isChairman: false, reviewStarted: true})).toBe(
      'Only the chairman can record the official outcome.',
    );
  });

  it('rejects an incomplete roster', () => {
    expect(validateChairDecision({complete: false, isChairman: true, reviewStarted: true})).toBe(
      'Every required reviewer must vote first.',
    );
  });
});
