export const RANKS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type Rank = (typeof RANKS)[number];

export const BALLOTS = [...RANKS, 'ABSTAIN'] as const;
export type Ballot = (typeof BALLOTS)[number];

export const BALLOT_LABELS: Record<Ballot, string> = {
  ABSTAIN: 'Abstain',
  HIGH: 'High Priority',
  LOW: 'Low Priority',
  MEDIUM: 'Medium Priority',
};

export const isBallot = (value: string): value is Ballot =>
  (BALLOTS as readonly string[]).includes(value);

export type VoteTally = {
  abstain: number;
  complete: boolean;
  high: number;
  leaning: Rank | null;
  low: number;
  medium: number;
  notVoted: number;
};

const rankCounts = (votes: Ballot[]) => {
  const high = votes.filter((vote) => vote === 'HIGH').length;
  const medium = votes.filter((vote) => vote === 'MEDIUM').length;
  const low = votes.filter((vote) => vote === 'LOW').length;
  return {high, low, medium};
};

export const ballotLeaning = (votes: Ballot[]): Rank | null => {
  const ranked = votes.filter((vote): vote is Rank => vote !== 'ABSTAIN');
  if (ranked.length === 0) return null;
  const counts = rankCounts(ranked);
  const byRank: Record<Rank, number> = {HIGH: counts.high, LOW: counts.low, MEDIUM: counts.medium};
  const max = Math.max(counts.high, counts.medium, counts.low);
  const winners = RANKS.filter((rank) => byRank[rank] === max);
  return winners.length === 1 ? winners[0] : null;
};

export const tallyVotes = (
  votes: {vote: Ballot; voterId: string}[],
  eligibleVoterIds: string[],
  teacherId: string,
): VoteTally => {
  const eligible = new Set(eligibleVoterIds.filter((id) => id !== teacherId));
  const counted = votes.filter((vote) => eligible.has(vote.voterId));
  const ballots = counted.map((vote) => vote.vote);
  const {high, low, medium} = rankCounts(ballots);
  const abstain = counted.filter((vote) => vote.vote === 'ABSTAIN').length;
  const complete = eligible.size > 0 && counted.length >= eligible.size;

  return {
    abstain,
    complete,
    high,
    leaning: ballotLeaning(ballots),
    low,
    medium,
    notVoted: Math.max(0, eligible.size - counted.length),
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
  if (!input.complete) return 'Every required reviewer must rank first.';
  return null;
};
