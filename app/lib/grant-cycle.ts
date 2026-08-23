export type CycleInput = {
  budgetLimit: number;
  chairmanUserId: string;
  committeeUserIds: string[];
  endsAt: string;
  isActive: boolean;
  name: string;
  principalUserId: string;
  reviewEndsAt: string;
  reviewStartsAt: string;
  schoolYearId: string;
  semester: string;
  startsAt: string;
  treasurerUserId: string;
};

export const parseCycleSemester = (value: string): 'FALL' | 'SPRING' | null =>
  value === 'FALL' || value === 'SPRING' ? value : null;

const parsedTime = (value: string): number => Date.parse(value);

export const isSubmissionOpen = (
  cycle: {ends_at: string; is_active: number; starts_at: string},
  now = new Date(),
): boolean => {
  if (cycle.is_active !== 1) return false;
  const time = now.getTime();
  return time >= parsedTime(cycle.starts_at) && time < parsedTime(cycle.ends_at);
};

export const isReviewOpen = (
  cycle: {review_ends_at: string | null; review_starts_at: string | null},
  now = new Date(),
): boolean => {
  if (!cycle.review_starts_at || !cycle.review_ends_at) return false;
  const time = now.getTime();
  return time >= parsedTime(cycle.review_starts_at) && time < parsedTime(cycle.review_ends_at);
};

export const hasReviewStarted = (
  cycle: {review_starts_at: string | null},
  now = new Date(),
): boolean => {
  if (!cycle.review_starts_at) return false;
  return now.getTime() >= parsedTime(cycle.review_starts_at);
};

export const validateCycleInput = (input: CycleInput): string | null => {
  if (!input.name.trim()) return 'Window name is required.';
  if (input.budgetLimit < 0) return 'Check the dollar amounts.';
  if (!parseCycleSemester(input.semester)) return 'Pick Fall or Spring.';
  if (!input.startsAt || !input.endsAt) return 'Submission dates are required.';
  if (!input.reviewStartsAt || !input.reviewEndsAt) return 'Review dates are required.';
  if (parsedTime(input.endsAt) <= parsedTime(input.startsAt)) {
    return 'Submission close must be after it opens.';
  }
  if (parsedTime(input.reviewStartsAt) < parsedTime(input.endsAt)) {
    return 'Review must start when submissions close or later.';
  }
  if (parsedTime(input.reviewEndsAt) <= parsedTime(input.reviewStartsAt)) {
    return 'Review close must be after review opens.';
  }
  return null;
};

export const toDatetimeLocalValue = (value: string): string => {
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return match?.[1] ?? value;
};
