import type {Role} from '~/lib/roles';
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
  '/chair': 'chairman',
  '/fulfill': 'fulfill',
  '/portal': 'teacher',
  '/review': 'reviewer',
};

export const tourPageFromPath = (pathname: string, role?: Role): TourPage | null => {
  if (pathname === '/') {
    // Shared home hosts role guides; only the admin home has the treasurer tour.
    return role === 'admin' || role === undefined ? 'treasurer' : null;
  }
  return TOUR_HOMES[pathname] ?? null;
};

export const tourStorageKey = (page: TourPage): string => `bhe-tour:v2:${page}`;

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
        'Every request you have submitted lives here, across school years. Open a row for details or to confirm delivery once an order arrives.',
      title: 'My grants',
    },
  },
  {
    element: '[data-tour="window-banner"]',
    optional: true,
    popover: {
      description:
        'A gold banner means a window is open for new requests. When no window is open, you can still read past grants.',
      title: 'When you can apply',
    },
  },
  {
    element: '[data-tour="submit-grant"]',
    optional: true,
    popover: {
      description:
        'A short guided form walks you through the request, who it benefits, and each item — import a public Amazon wishlist or paste product links one at a time. Drafts save as you go. Reviewers rank once the review window opens.',
      title: 'Submit a grant',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Watch a request move from Draft to Voting, then Approved or Rejected, Purchased, and Delivered. Click a title to open it — you can edit a submitted request until committee review starts.',
      title: 'Track the status',
    },
  },
  {
    element: '[data-tour="nav-review"]',
    optional: true,
    popover: {
      description:
        "If you also sit on the committee, Review is where you rank other teachers' grants. Your own grant never appears there.",
      title: 'Review other grants',
    },
  },
];

const REVIEWER_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Grants that still need your rank appear under Still need your rank. When the review window is closed, the empty state explains when ranking opens again.',
      title: 'Your review queue',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a request to rank High, Medium, or Low Priority — or Abstain. Other reviewers cannot see your rank. Your own grant never appears here.',
      title: 'Cast a private rank',
    },
  },
  {
    element: '[data-tour="ranked-section"]',
    optional: true,
    popover: {
      description:
        'After you submit a rank, the grant moves to Already ranked so you can revisit it without cluttering the pending queue.',
      title: 'Already ranked',
    },
  },
];

const CHAIRMAN_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Run the cycle here step by step. Sending evaluation instructions marks Review done, and you can approve or reject a submitted grant before every rank is in.',
      title: 'Chair home',
    },
  },
  {
    element: '[data-tour="nav-windows"]',
    optional: true,
    popover: {
      description:
        'Publish or edit grant windows — dates, budget, and officers. School years themselves are managed in Admin.',
      title: 'Grant windows',
    },
  },
  {
    element: '[data-tour="chair-playbook"]',
    popover: {
      description:
        'The progress rail shows where you are in the cycle. Checkmarks follow real status — some steps auto-complete; mark outreach steps when you finish them.',
      title: 'Progress rail',
    },
  },
  {
    element: '[data-tour="chair-step"]',
    optional: true,
    popover: {
      description:
        'Each screen has the tools and email templates for that step. Use Continue and Back to move around; the page opens on your first incomplete step. A teacher on the committee is recused from ranking their own grant.',
      title: 'Current step',
    },
  },
];

const TREASURER_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Admin home for the active window: what still needs a vote, what to buy, and what budget remains. People, school years, and related settings live under Admin in the sidebar; Budget and Grants are there too.',
      title: 'Window at a glance',
    },
  },
  {
    element: '[data-tour="stat-pending"]',
    optional: true,
    popover: {
      description: 'Submitted grants still waiting on reviewer ranks or a chair decision.',
      title: 'Pending grants',
    },
  },
  {
    element: '[data-tour="stat-purchase"]',
    optional: true,
    popover: {
      description:
        'Approved grants that have not been purchased yet. Buying and tracking happen on Fulfillment.',
      title: 'To purchase',
    },
  },
  {
    element: '[data-tour="stat-budget"]',
    optional: true,
    popover: {
      description: 'What is left after committed approvals and actual spend for this window.',
      title: 'Remaining this window',
    },
  },
  {
    element: '[data-tour="home-submit"]',
    optional: true,
    popover: {
      description:
        'When a window is open, you can submit a grant on behalf of a teacher from here. The same guided steps ask for the request, who it benefits, and items (wishlist or product links).',
      title: 'Submit a grant',
    },
  },
  {
    element: '[data-tour="home-review"]',
    optional: true,
    popover: {
      description:
        'If you hold a reviewer seat, open Review to rank grants. Other reviewers cannot see your rank; the chair sees tallies when deciding.',
      title: 'Review',
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
  {
    element: '[data-tour="process-guide"]',
    optional: true,
    popover: {
      description:
        'Full-cycle playbook for running a grant window, with evaluation criteria, priority guidelines, and copyable email templates.',
      title: 'Process guide',
    },
  },
];

const FULFILL_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Approved, purchased, and delivered grants live here — the queue for buying and tracking orders.',
      title: 'Fulfillment',
    },
  },
  {
    element: '[data-tour="year-filter"]',
    optional: true,
    popover: {
      description: "Filter by school year and semester when you need a past window's orders.",
      title: 'Year and semester',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a grant to record what you actually paid, attach a receipt, and add a tracking number. Teachers confirm delivery from My grants.',
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
