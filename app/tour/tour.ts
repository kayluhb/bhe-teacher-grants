import type {GrantStatus} from '~/lib/status';
import type {GrantRow} from '~/lib/types';
import fixtures from '~/tour/fixtures.json';

export type TourPage = 'teacher' | 'reviewer' | 'chairman' | 'treasurer' | 'fulfill';

export type TourGrantPartial = Partial<GrantRow> & {
  id: string;
  status: GrantStatus;
  title: string;
};

export type TourStep = {
  element: string;
  optional?: boolean;
  popover: {description: string; title: string};
};

export type TourStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const TOUR_HOMES: Record<string, TourPage> = {
  '/': 'treasurer',
  '/chair': 'chairman',
  '/fulfill': 'fulfill',
  '/portal': 'teacher',
  '/review': 'reviewer',
};

export const tourPageFromPath = (pathname: string): TourPage | null => TOUR_HOMES[pathname] ?? null;

export const tourStorageKey = (page: TourPage): string => `bhe-tour:${page}`;

export const hasSeenTour = (storage: TourStorage, page: TourPage): boolean =>
  storage.getItem(tourStorageKey(page)) === '1';

export const markTourSeen = (storage: TourStorage, page: TourPage): void => {
  storage.setItem(tourStorageKey(page), '1');
};

type FixtureRow = (typeof fixtures)[keyof typeof fixtures][number];

export const hydrateTourGrant = ({
  id,
  status,
  title,
  ...rest
}: TourGrantPartial | FixtureRow): GrantRow => ({
  actual_amount: null,
  approved_amount: null,
  benefit_scope: 'CLASS',
  cycle_id: 'cycle_fall_2026',
  delivered_at: null,
  grade_level_subject: '2nd grade',
  impact_statement: '',
  proof_of_delivery_r2_key: null,
  purchased_at: null,
  receipt_r2_key: null,
  rejection_reason: null,
  requested_amount: 100,
  semester: 'FALL',
  school_year: '2026-27',
  school_year_id: '2026-27',
  teacher_email: 'teacher@austinisd.org',
  teacher_id: 'user_teacher',
  teacher_name: 'Jordan Lee',
  tracking_number: null,
  variance_note: null,
  vendor_name: null,
  wishlist_url: null,
  preview_images: [],
  ...(rest as Partial<GrantRow>),
  id,
  status: status as GrantStatus,
  title,
});

export const overlayTourGrants = ({
  fixtures: fixtureRows,
  real,
  tourActive,
}: {
  fixtures: GrantRow[];
  real: GrantRow[];
  tourActive: boolean;
}): {grants: GrantRow[]; usingFixtures: boolean} => {
  if (tourActive && real.length === 0) {
    return {grants: fixtureRows, usingFixtures: true};
  }
  return {grants: real, usingFixtures: false};
};

export const fixturesFor = (queue: keyof typeof fixtures): GrantRow[] =>
  fixtures[queue].map((row) => hydrateTourGrant(row));

const TEACHER_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Every request you submit lives here, across school years. Open a row to read the details or confirm delivery.',
      title: 'Your grants',
    },
  },
  {
    element: '[data-tour="window-banner"]',
    optional: true,
    popover: {
      description:
        'A gold banner means a window is open for new requests. If the window is closed, you can still read past grants.',
      title: 'When you can apply',
    },
  },
  {
    element: '[data-tour="submit-grant"]',
    optional: true,
    popover: {
      description:
        'Open the form, add line items (a public wishlist is optional), and send it in. Voting does not start until the review window opens.',
      title: 'Submit a grant',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Watch a request move from draft to voting, approved, purchased, then delivered. Click a title for the full story.',
      title: 'Track the status',
    },
  },
  {
    element: '[data-tour="nav-review"]',
    optional: true,
    popover: {
      description:
        'If you sit on the committee, Review is a separate queue. Your own grant never appears there.',
      title: 'Review other grants',
    },
  },
];

const REVIEWER_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Only grants you have not voted on, in an open review window. After you submit a ballot, the grant leaves this list.',
      title: 'Your review queue',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a request to Approve, Reject, or Abstain. You will not see anyone else’s votes. Abstain still counts as done so the chairman is not blocked. Your own submission never shows up here.',
      title: 'Cast a private ballot',
    },
  },
];

const CHAIRMAN_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Grants appear here only after every required reviewer has voted. The submitting teacher is recused, so their ballot is not required.',
      title: 'Ready for a decision',
    },
  },
  {
    element: '[data-tour="committee"]',
    optional: true,
    popover: {
      description:
        'Search by name or email to add reviewers. A new person can be created here; they can sign in later.',
      title: 'Your committee',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a grant to see the full tally. You may follow it or override it. The teacher is emailed after you record the outcome.',
      title: 'Record the outcome',
    },
  },
];

const TREASURER_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'This is the treasurer home for the active window: what still needs a vote, what to buy, and what budget remains.',
      title: 'Window at a glance',
    },
  },
  {
    element: '[data-tour="stat-pending"]',
    optional: true,
    popover: {
      description: 'Submitted grants still waiting on reviewer ballots or a chairman decision.',
      title: 'Pending grants',
    },
  },
  {
    element: '[data-tour="stat-purchase"]',
    optional: true,
    popover: {
      description:
        'Approved grants that have not been purchased yet. Fulfillment happens on a separate page.',
      title: 'To purchase',
    },
  },
  {
    element: '[data-tour="stat-budget"]',
    optional: true,
    popover: {
      description:
        'What is left after committed approvals and actual spend. Unused funds return to the window.',
      title: 'Remaining this window',
    },
  },
  {
    element: '[data-tour="home-review"]',
    optional: true,
    popover: {
      description:
        'You vote in the reviewer portal, the same as the principal and committee. Ballots stay private until the chairman decides.',
      title: 'Review queue',
    },
  },
  {
    element: '[data-tour="home-fulfill"]',
    optional: true,
    popover: {
      description: 'Buy the approved items, record actual prices from receipts, and add tracking.',
      title: 'Fulfillment',
    },
  },
];

const FULFILL_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Approved, purchased, and delivered grants live here. Filter by school year and semester the way Barton Hills files reimbursements.',
      title: 'Fulfillment',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a grant to record what you actually paid, attach a receipt, and add a tracking number. Teachers confirm delivery from their own portal.',
      title: 'Record the purchase',
    },
  },
];

const STEPS: Record<TourPage, TourStep[]> = {
  chairman: CHAIRMAN_STEPS,
  fulfill: FULFILL_STEPS,
  reviewer: REVIEWER_STEPS,
  teacher: TEACHER_STEPS,
  treasurer: TREASURER_STEPS,
};

export const stepsFor = (page: TourPage): TourStep[] => STEPS[page];

export const visibleTourSteps = (
  steps: TourStep[],
  hasElement: (selector: string) => boolean,
): TourStep[] => steps.filter((step) => !step.optional || hasElement(step.element));
