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
        'Every request you have submitted lives here, across school years. Open a row for details or to confirm delivery.',
      title: 'My grants',
    },
  },
  {
    element: '[data-tour="window-banner"]',
    optional: true,
    popover: {
      description:
        'A gold banner means a window is open for new requests. When it is closed, you can still read past grants.',
      title: 'When you can apply',
    },
  },
  {
    element: '[data-tour="submit-grant"]',
    optional: true,
    popover: {
      description:
        'Open the form, add line items (a public wishlist is optional), and send it in. Voting starts when the review window opens.',
      title: 'Submit a grant',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Watch a request move from Draft to Voting, then Approved or Rejected, Purchased, and Delivered. Click a title for the full story.',
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
        'Grants that still need your rank appear first. When the review window is closed, the empty state explains when ranking opens again.',
      title: 'Your review queue',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a request to rank High, Medium, or Low Priority — or Abstain. Ranks are private and help sequence funding; your own grant never appears here.',
      title: 'Cast a private rank',
    },
  },
  {
    element: '[data-tour="ranked-section"]',
    optional: true,
    popover: {
      description:
        'After you submit a rank, the grant moves here so you can revisit what you voted without changing the pending queue.',
      title: 'Already ranked',
    },
  },
];

const CHAIRMAN_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Confirm the committee, track ranks as they come in, and record outcomes once every required ballot is in. The submitting teacher is recused, so their vote is not required.',
      title: 'Chair home',
    },
  },
  {
    element: '[data-tour="nav-windows"]',
    optional: true,
    popover: {
      description:
        'Publish or edit grant windows — school year, dates, budget, and officers. School years themselves are managed in Admin.',
      title: 'Grant windows',
    },
  },
  {
    element: '[data-tour="committee"]',
    optional: true,
    popover: {
      description:
        'Principal and Treasurer come from the window officers. Add the Faculty Rep and board members here. Use the help icon next to Roll call for seat rules and alternates.',
      title: 'Your committee',
    },
  },
  {
    element: '[data-tour="eval-email"]',
    optional: true,
    popover: {
      description:
        'Send evaluation instructions to the voters for this window. Replies go to your email. Seat the committee above before sending.',
      title: 'Email the committee',
    },
  },
  {
    element: '[data-tour="grant-table"]',
    popover: {
      description:
        'Open a grant to see rank tallies and what the committee is leaning. Record approve or reject when voting is complete — the teacher is emailed automatically.',
      title: 'Chair queue',
    },
  },
  {
    element: '[data-tour="chair-playbook"]',
    optional: true,
    popover: {
      description:
        'Status-aware checklist for the cycle — some steps auto-complete; mark outreach steps when you finish them.',
      title: 'Chair playbook',
    },
  },
  {
    element: '[data-tour="email-templates"]',
    optional: true,
    popover: {
      description:
        'Copy launch, reminder, evaluation, approval, rejection, and outcome-story emails. Replace placeholders with this cycle\'s details.',
      title: 'Email templates',
    },
  },
];

const TREASURER_STEPS: TourStep[] = [
  {
    element: '[data-tour="page-heading"]',
    popover: {
      description:
        'Admin home for the active window: what still needs a vote, what to buy, and what budget remains. Roster, school years, and windows live under Admin in the sidebar; Budget and Grants are there too.',
      title: 'Window at a glance',
    },
  },
  {
    element: '[data-tour="stat-pending"]',
    optional: true,
    popover: {
      description: 'Submitted grants still waiting on reviewer ballots or a chair decision.',
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
    element: '[data-tour="home-submit"]',
    optional: true,
    popover: {
      description:
        'When a window is open, you can submit a grant on behalf of a teacher from here.',
      title: 'Submit a grant',
    },
  },
  {
    element: '[data-tour="home-review"]',
    optional: true,
    popover: {
      description:
        'You rank grants in the reviewer portal, the same as the principal and committee. Ranks stay private until the chair decides.',
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
      description:
        'Filter by school year and semester the way Barton Hills files reimbursements.',
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
