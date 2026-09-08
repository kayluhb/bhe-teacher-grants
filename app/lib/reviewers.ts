export type ReviewerSeat = 'treasurer' | 'principal' | 'chairman' | 'committee';

export const SEAT_LABELS: Record<ReviewerSeat, string> = {
  chairman: 'Grant Chair',
  committee: 'Committee (Faculty Rep / Board)',
  principal: 'Principal',
  treasurer: 'Finance Chair (Treasurer)',
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
  const officers = [treasurer, principal, chairman].filter(Boolean);
  if (new Set(officers).size !== officers.length) {
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
}): ReviewerAssignment[] => {
  const seats: {seat: ReviewerSeat; userId: string}[] = [
    {seat: 'treasurer', userId: input.treasurerUserId.trim()},
    {seat: 'principal', userId: input.principalUserId.trim()},
    {seat: 'chairman', userId: input.chairmanUserId.trim()},
  ];
  return [
    ...seats.filter((row) => row.userId),
    ...[...new Set(input.committeeUserIds.map((id) => id.trim()).filter(Boolean))].map(
      (userId) => ({
        seat: 'committee' as const,
        userId,
      }),
    ),
  ];
};

export type Portal = 'teacher' | 'reviewer' | 'chairman' | 'treasurer';
