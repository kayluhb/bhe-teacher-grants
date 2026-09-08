import {describe, expect, it} from 'vitest';
import {
  ballotLeaning,
  isChairActor,
  nextBallotHref,
  splitReviewQueue,
  tallyVotes,
  validateChairDecision,
} from '~/lib/votes';

const voters = ['treasurer', 'principal', 'committee'];

describe('splitReviewQueue', () => {
  it('puts unvoted grants in pending and voted grants in ranked', () => {
    expect(
      splitReviewQueue([
        {id: 'a', my_vote: null},
        {id: 'b', my_vote: 'HIGH'},
        {id: 'c', my_vote: 'ABSTAIN'},
        {id: 'd', my_vote: null},
      ]),
    ).toEqual({
      pending: [
        {id: 'a', my_vote: null},
        {id: 'd', my_vote: null},
      ],
      ranked: [
        {id: 'b', my_vote: 'HIGH'},
        {id: 'c', my_vote: 'ABSTAIN'},
      ],
    });
  });
});

describe('tallyVotes', () => {
  it('stays incomplete until every required voter has a ballot', () => {
    const tally = tallyVotes([{vote: 'HIGH', voterId: 'treasurer'}], voters, 'teacher');
    expect(tally.complete).toBe(false);
    expect(tally.notVoted).toBe(2);
  });

  it('is complete when every required voter has voted, including abstain', () => {
    const tally = tallyVotes(
      [
        {vote: 'HIGH', voterId: 'treasurer'},
        {vote: 'LOW', voterId: 'principal'},
        {vote: 'ABSTAIN', voterId: 'committee'},
      ],
      voters,
      'teacher',
    );
    expect(tally.complete).toBe(true);
    expect(tally.notVoted).toBe(0);
  });

  it('leans High from ranked ballots even while the roster is incomplete', () => {
    const tally = tallyVotes(
      [
        {vote: 'HIGH', voterId: 'treasurer'},
        {vote: 'HIGH', voterId: 'principal'},
      ],
      voters,
      'teacher',
    );
    expect(tally.leaning).toBe('HIGH');
    expect(tally.complete).toBe(false);
  });

  it('ignores the submitting teacher even if listed as eligible', () => {
    const tally = tallyVotes(
      [{vote: 'HIGH', voterId: 'teacher'}],
      [...voters, 'teacher'],
      'teacher',
    );
    expect(tally.high).toBe(0);
    expect(tally.complete).toBe(false);
  });
});

describe('ballotLeaning', () => {
  it('returns the unique mode of High / Medium / Low', () => {
    expect(ballotLeaning(['HIGH', 'HIGH', 'LOW'])).toBe('HIGH');
  });

  it('ignores abstain when finding the mode', () => {
    expect(ballotLeaning(['HIGH', 'ABSTAIN', 'ABSTAIN'])).toBe('HIGH');
  });

  it('returns null on a tie or when nobody ranked', () => {
    expect(ballotLeaning(['HIGH', 'MEDIUM', 'LOW'])).toBeNull();
    expect(ballotLeaning(['HIGH', 'HIGH', 'MEDIUM', 'MEDIUM'])).toBeNull();
    expect(ballotLeaning(['ABSTAIN', 'ABSTAIN'])).toBeNull();
  });
});

describe('nextBallotHref', () => {
  it('skips the grant just voted so the reviewer is not sent back to the same page', () => {
    expect(nextBallotHref([{id: 'current'}, {id: 'next'}], 'current')).toBe('/review/next');
  });

  it('returns the review queue when the current grant is the last remaining', () => {
    expect(nextBallotHref([{id: 'current'}], 'current')).toBe('/review');
  });
});

describe('isChairActor', () => {
  it('allows the chair role even when the actor is not the seated chairman id', () => {
    expect(isChairActor({id: 'admin', role: 'chair'}, 'user_chairman')).toBe(true);
  });

  it('allows a seated chairman under another role', () => {
    expect(isChairActor({id: 'user_chairman', role: 'admin'}, 'user_chairman')).toBe(true);
  });

  it('rejects anyone else', () => {
    expect(isChairActor({id: 'admin', role: 'admin'}, 'user_chairman')).toBe(false);
    expect(isChairActor({id: 'committee', role: 'committee'}, 'user_chairman')).toBe(false);
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
      'Every required reviewer must rank first.',
    );
  });
});
