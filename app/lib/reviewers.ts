export type ReviewerSeat = 'treasurer' | 'principal' | 'chairman' | 'committee';

export const SEAT_LABELS: Record<ReviewerSeat, string> = {
  chairman: 'Chair',
  committee: 'Committee',
  principal: 'Principal',
  treasurer: 'Treasurer',
};

export type ReviewerAssignment = {
  seat: ReviewerSeat;
  userId: string;
};

export const VOTER_SEATS: ReviewerSeat[] = ['treasurer', 'principal', 'committee'];

export const requiredVoterIds = (reviewers: ReviewerAssignment[], teacherId: string): string[] => [
  ...new Set(
    reviewers
      .filter((row) => VOTER_SEATS.includes(row.seat) && row.userId !== teacherId)
      .map((row) => row.userId),
  ),
];

export const validateReviewerRoster = (input: {
  chairmanUserId: string;
  committeeUserIds: string[];
  principalUserId: string;
  treasurerUserId: string;
}): string | null => {
  const treasurer = input.treasurerUserId.trim();
  const principal = input.principalUserId.trim();
  const chairman = input.chairmanUserId.trim();
  const committee = [...new Set(input.committeeUserIds.map((id) => id.trim()).filter(Boolean))];
  if (!treasurer || !principal || !chairman) {
    return 'Pick a treasurer, principal, and chairman.';
  }
  if (committee.length === 0) return 'Add at least one committee reviewer.';
  const officers = [treasurer, principal, chairman];
  if (new Set(officers).size !== 3) {
    return 'Treasurer, principal, and chairman must be different people.';
  }
  if (committee.some((id) => officers.includes(id))) {
    return 'Committee reviewers cannot also hold an officer seat.';
  }
  return null;
};

export const rosterAssignments = (input: {
  chairmanUserId: string;
  committeeUserIds: string[];
  principalUserId: string;
  treasurerUserId: string;
}): ReviewerAssignment[] => [
  {seat: 'treasurer', userId: input.treasurerUserId},
  {seat: 'principal', userId: input.principalUserId},
  {seat: 'chairman', userId: input.chairmanUserId},
  ...[...new Set(input.committeeUserIds.filter(Boolean))].map((userId) => ({
    seat: 'committee' as const,
    userId,
  })),
];

export type Portal = 'teacher' | 'reviewer' | 'chairman' | 'treasurer';
