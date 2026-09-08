import {createCycleAction, setActiveCycleAction, updateCycleAction} from '~/chair/actions';
import {GrantWindowsPanel} from '~/components/grant-windows-panel';
import {listCycleReviewers, listUsers} from '~/lib/admin';
import {requireChairman} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {listCycles, listSchoolYears} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.chairWindows};

export default async function ChairWindowsPage() {
  await requireChairman();
  const db = getDb();
  const [cycles, years, users] = await Promise.all([
    listCycles(db),
    listSchoolYears(db),
    listUsers(db),
  ]);
  const reviewers = await Promise.all(
    cycles.map(async (cycle) => ({
      cycleId: cycle.id,
      rows: await listCycleReviewers(db, cycle.id),
    })),
  );
  const reviewersByCycle = Object.fromEntries(reviewers.map((row) => [row.cycleId, row.rows]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">Grant windows</h1>
        <p className="font-body mt-1 text-gray-600">
          Create or edit submission and review dates, budget, and officers. Mark a window open so
          teachers can apply.
        </p>
      </div>
      <GrantWindowsPanel
        createAction={createCycleAction}
        cycles={cycles}
        reviewersByCycle={reviewersByCycle}
        setActiveAction={setActiveCycleAction}
        showIntro={false}
        updateAction={updateCycleAction}
        users={users}
        years={years}
      />
    </div>
  );
}
