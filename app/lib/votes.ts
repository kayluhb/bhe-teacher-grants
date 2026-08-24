export type Ballot = 'APPROVE' | 'REJECT' | 'ABSTAIN';

export type VoteTally = {
  approve: number;
  reject: number;
  abstain: number;
  notVoted: number;
  complete: boolean;
  decided: boolean;
  outcome: 'APPROVED' | 'REJECTED' | null;
};

export const tallyVotes = (
  votes: {vote: Ballot; voterId: string}[],
  eligibleVoterIds: string[],
  teacherId: string,
): VoteTally => {
  const eligible = new Set(eligibleVoterIds.filter((id) => id !== teacherId));
  const counted = votes.filter((vote) => eligible.has(vote.voterId));
  const approve = counted.filter((vote) => vote.vote === 'APPROVE').length;
  const reject = counted.filter((vote) => vote.vote === 'REJECT').length;
  const abstain = counted.filter((vote) => vote.vote === 'ABSTAIN').length;
  const majorityNeeded = Math.floor(eligible.size / 2) + 1;
  const decided = approve >= majorityNeeded || reject >= majorityNeeded;
  const outcome = !decided ? null : approve > reject ? 'APPROVED' : 'REJECTED';
  const complete = eligible.size > 0 && counted.length >= eligible.size;

  return {
    approve,
    reject,
    abstain,
    notVoted: Math.max(0, eligible.size - counted.length),
    complete,
    decided,
    outcome,
  };
};

export const nextBallotHref = (remaining: {id: string}[], currentGrantId: string) => {
  const next = remaining.find((grant) => grant.id !== currentGrantId);
  return next ? `/review/${next.id}` : '/review';
};

export const validateChairDecision = (input: {
  complete: boolean;
  isChairman: boolean;
  reviewStarted: boolean;
}): string | null => {
  if (!input.isChairman) return 'Only the chairman can record the official outcome.';
  if (!input.reviewStarted) return 'Review has not started yet.';
  if (!input.complete) return 'Every required reviewer must vote first.';
  return null;
};
