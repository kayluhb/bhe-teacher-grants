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

const SCHOOL_TIME_ZONE = 'America/Chicago';

const formatInSchoolZone = (value: string, options: Intl.DateTimeFormatOptions): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {timeZone: SCHOOL_TIME_ZONE, ...options}).format(date);
};

export const formatSchoolDateTime = (value: string): string =>
  formatInSchoolZone(value, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    timeZoneName: 'short',
    weekday: 'long',
    year: 'numeric',
  });

export const formatSchoolCompactDateTime = (value: string): string =>
  formatInSchoolZone(value, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const formatSchoolDateRange = (start: string, end: string): string =>
  `${formatSchoolCompactDateTime(start)} – ${formatSchoolCompactDateTime(end)}`;

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

export type ReviewCycle = {
  ends_at: string;
  is_active: number;
  name: string;
  review_ends_at: string | null;
  review_starts_at: string | null;
  starts_at: string;
};

export type ReviewWindowState =
  | {cycle: ReviewCycle; kind: 'closed'}
  | {cycle: ReviewCycle; kind: 'open'}
  | {cycle: ReviewCycle; kind: 'upcoming'}
  | {kind: 'none'};

export type QueueCopy = {paragraphs: string[]; subtitle: string};

const byTime = (value: string | null): number => (value ? parsedTime(value) : Number.NaN);

export const reviewWindowState = (cycles: ReviewCycle[], now = new Date()): ReviewWindowState => {
  const open = cycles.find((cycle) => isReviewOpen(cycle, now));
  if (open) return {cycle: open, kind: 'open'};
  const upcoming = [...cycles]
    .filter((cycle) => cycle.review_starts_at && now.getTime() < parsedTime(cycle.review_starts_at))
    .sort((a, b) => byTime(a.review_starts_at) - byTime(b.review_starts_at))[0];
  if (upcoming) return {cycle: upcoming, kind: 'upcoming'};
  const closed = [...cycles]
    .filter((cycle) => cycle.review_ends_at && now.getTime() >= parsedTime(cycle.review_ends_at))
    .sort((a, b) => byTime(b.review_ends_at) - byTime(a.review_ends_at))[0];
  if (closed) return {cycle: closed, kind: 'closed'};
  return {kind: 'none'};
};

const datedOpen = (cycle: ReviewCycle): string => {
  const start = cycle.review_starts_at ? formatSchoolDateTime(cycle.review_starts_at) : 'soon';
  const end = cycle.review_ends_at
    ? ` and close ${formatSchoolDateTime(cycle.review_ends_at)}`
    : '';
  return `They open ${start} for ${cycle.name}${end}.`;
};

export const reviewQueueMessaging = (state: ReviewWindowState, now = new Date()): QueueCopy => {
  if (state.kind === 'upcoming') {
    const submitting = isSubmissionOpen(state.cycle, now);
    return {
      paragraphs: [
        datedOpen(state.cycle),
        submitting
          ? 'Teachers can still submit until then. After review opens, those grants will appear here for you to rank. After you submit a rank, the next grant opens.'
          : 'When they do, submitted grants will appear here for you to rank. After you submit a rank, the next grant opens.',
      ],
      subtitle: "Reviews aren't open yet.",
    };
  }
  if (state.kind === 'closed') {
    const ended = state.cycle.review_ends_at
      ? formatSchoolDateTime(state.cycle.review_ends_at)
      : null;
    return {
      paragraphs: [
        ended
          ? `Review for ${state.cycle.name} closed ${ended}.`
          : `Review for ${state.cycle.name} has closed.`,
      ],
      subtitle: 'The review window has closed.',
    };
  }
  if (state.kind === 'open') {
    return {
      paragraphs: ["You're caught up. There are no grants waiting for your rank."],
      subtitle: 'Grants you still need to rank. After you submit a rank, the next grant opens.',
    };
  }
  return {
    paragraphs: ['Nothing here yet.'],
    subtitle: 'Grants you still need to rank. After you submit a rank, the next grant opens.',
  };
};

export const fulfillQueueMessaging = (state: ReviewWindowState): QueueCopy => {
  if (state.kind === 'upcoming') {
    const start = state.cycle.review_starts_at
      ? formatSchoolDateTime(state.cycle.review_starts_at)
      : 'after review';
    return {
      paragraphs: [
        `Approved grants will appear here after review. Review for ${state.cycle.name} opens ${start}.`,
        "When a grant is approved, you'll buy the items, record actual prices from the receipt, and add tracking. Teachers confirm delivery from their own portal.",
      ],
      subtitle: "Fulfillment isn't ready yet.",
    };
  }
  if (state.kind === 'open') {
    const end = state.cycle.review_ends_at
      ? formatSchoolDateTime(state.cycle.review_ends_at)
      : null;
    return {
      paragraphs: [
        end
          ? `Review for ${state.cycle.name} is open through ${end}. After the chairman records a decision, approved grants will appear here for you to purchase.`
          : `Review for ${state.cycle.name} is underway. After the chairman records a decision, approved grants will appear here for you to purchase.`,
      ],
      subtitle: 'Waiting on approved grants.',
    };
  }
  if (state.kind === 'closed') {
    return {
      paragraphs: [
        `Review for ${state.cycle.name} has closed. If any grants are approved, they will appear here for you to purchase.`,
      ],
      subtitle: 'No approved grants yet.',
    };
  }
  return {
    paragraphs: ['Nothing here yet.'],
    subtitle: 'Approved grants to buy, plus orders already placed.',
  };
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
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(value)) {
    const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return match?.[1] ?? value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      timeZone: SCHOOL_TIME_ZONE,
      year: 'numeric',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const fromDatetimeLocalValue = (value: string): string => {
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  const local = value.length === 16 ? `${value}:00` : value;
  for (const offset of ['-05:00', '-06:00'] as const) {
    const date = new Date(`${local}${offset}`);
    if (Number.isNaN(date.getTime())) continue;
    if (toDatetimeLocalValue(date.toISOString()) === value.slice(0, 16)) {
      return date.toISOString();
    }
  }
  return new Date(`${local}-06:00`).toISOString();
};
