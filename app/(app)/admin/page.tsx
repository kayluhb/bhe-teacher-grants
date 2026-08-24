import Link from 'next/link';
import {
  addRosterUserAction,
  createCycleAction,
  createSchoolYearAction,
  deleteUserAction,
  setActiveCycleAction,
  updateCycleAction,
  updateSchoolYearAction,
  updateUserNameAction,
  updateUserRoleAction,
} from '~/admin/actions';
import {AddPersonForm} from '~/components/add-person-form';
import {AutosaveForm} from '~/components/autosave-form';
import {DeletePersonForm} from '~/components/delete-person-form';
import {FormDialog} from '~/components/form-dialog';
import {GrantWindowForm} from '~/components/grant-window-form';
import {SchoolYearForm} from '~/components/school-year-form';
import {Select} from '~/components/select';
import {listCycleReviewers, listUsers} from '~/lib/admin';
import {ASSIGNABLE_ROLES, ROLE_LABELS, requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {formatSchoolCompactDateTime, formatSchoolDateRange} from '~/lib/grant-cycle';
import {listCycles, listSchoolYears} from '~/lib/grants';
import {isLockedRosterEmail} from '~/lib/login-email';
import {formatUsd} from '~/lib/money';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';

const ADMIN_TABS = [
  {id: 'roster', label: 'Roster'},
  {id: 'years', label: 'School years'},
  {id: 'windows', label: 'Grant windows'},
] as const;

type AdminTab = (typeof ADMIN_TABS)[number]['id'];

const parseAdminTab = (value: string | undefined): AdminTab =>
  ADMIN_TABS.some((tab) => tab.id === value) ? (value as AdminTab) : 'roster';

const TabField = ({tab}: {tab: AdminTab}) => <input name="tab" type="hidden" value={tab} />;

const DateRangeCell = ({end, start}: {end: string | null; start: string | null}) => {
  if (!start || !end) return <span className="text-gray-400">—</span>;
  return (
    <div className="whitespace-nowrap leading-5" title={formatSchoolDateRange(start, end)}>
      <div>{formatSchoolCompactDateTime(start)}</div>
      <div className="text-gray-500">– {formatSchoolCompactDateTime(end)}</div>
    </div>
  );
};

export const metadata = {title: DOCUMENT_TITLES.admin};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{error?: string; tab?: string}>;
}) {
  await requireRole('admin');
  const {error, tab: tabParam} = await searchParams;
  const tab = parseAdminTab(tabParam);
  const db = getDb();
  const [years, cycles, users] = await Promise.all([
    listSchoolYears(db),
    listCycles(db),
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
      <h1 className="font-heading text-3xl font-bold text-charcoal">Admin</h1>
      <nav
        aria-label="Admin sections"
        className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1"
      >
        {ADMIN_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-eagle-blue text-white' : 'text-charcoal hover:bg-warm-white'
              }`}
              href={`/admin?tab=${item.id}`}
              key={item.id}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === 'roster' ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-sm text-gray-600">
              Add people so they can sign in. AISD emails are teachers except
              kathryn.achtermann@austinisd.org (principal). Other emails are committee except
              treasurer@bheeagles.com.
            </p>
            <FormDialog
              description="They can sign in with this email after you add them. Change their role in the table if needed."
              padded={false}
              title="Add person"
              triggerLabel="Add person"
            >
              <AddPersonForm action={addRosterUserAction} tab={tab} />
            </FormDialog>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-warm-white text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-t border-gray-100" key={user.id}>
                    <td className="px-4 py-2">
                      <AutosaveForm action={updateUserNameAction}>
                        <TabField tab={tab} />
                        <input name="user_id" type="hidden" value={user.id} />
                        <input
                          aria-label="Name"
                          className="rounded-lg border border-gray-300 px-2 py-1"
                          defaultValue={user.name}
                          name="name"
                        />
                      </AutosaveForm>
                    </td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isLockedRosterEmail(user.email) ? (
                          <span>{ROLE_LABELS[user.role]}</span>
                        ) : (
                          <AutosaveForm action={updateUserRoleAction}>
                            <TabField tab={tab} />
                            <input name="user_id" type="hidden" value={user.id} />
                            <Select
                              aria-label={`Role for ${user.name}`}
                              defaultValue={user.role}
                              name="role"
                              options={ASSIGNABLE_ROLES.map((role) => ({
                                label: ROLE_LABELS[role],
                                value: role,
                              }))}
                              size="sm"
                            />
                          </AutosaveForm>
                        )}
                        {isLockedRosterEmail(user.email) ? null : (
                          <DeletePersonForm
                            action={deleteUserAction}
                            name={user.name}
                            tab={tab}
                            userId={user.id}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'years' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-end">
            <FormDialog
              description="Set the school year label and calendar dates used on grants and reports."
              padded={false}
              title="Add school year"
              triggerLabel="Add year"
            >
              <SchoolYearForm action={createSchoolYearAction} submitLabel="Add year" tab={tab} />
            </FormDialog>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-warm-white text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Year</th>
                  <th className="px-4 py-2">Starts</th>
                  <th className="px-4 py-2">Ends</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr className="border-t border-gray-100" key={year.id}>
                    <td className="px-4 py-2">{formatSchoolYearLong(year.label)}</td>
                    <td className="px-4 py-2">{year.starts_on}</td>
                    <td className="px-4 py-2">{year.ends_on}</td>
                    <td className="px-4 py-2">{year.is_default ? 'Current' : ''}</td>
                    <td className="px-4 py-2">
                      <FormDialog
                        description="Update this year's calendar dates and current-year status."
                        padded={false}
                        title="Edit school year"
                        triggerClassName="whitespace-nowrap text-eagle-blue underline"
                        triggerLabel="Edit"
                      >
                        <SchoolYearForm
                          action={updateSchoolYearAction}
                          submitLabel="Save year"
                          tab={tab}
                          year={year}
                        />
                      </FormDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'windows' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-end">
            <FormDialog
              description="Create a Fall or Spring window with a budget."
              padded={false}
              title="Add grant window"
              triggerLabel="Add window"
            >
              <GrantWindowForm
                action={createCycleAction}
                submitLabel="Add window"
                tab={tab}
                users={users}
                years={years}
              />
            </FormDialog>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-warm-white text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Window</th>
                  <th className="px-4 py-2">Submissions</th>
                  <th className="px-4 py-2">Review</th>
                  <th className="px-4 py-2">Budget</th>
                  <th className="px-4 py-2">Open</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr className="border-t border-gray-100" key={cycle.id}>
                    <td className="px-4 py-2">
                      {semesterLabel(cycle.semester)} {cycle.school_year}
                    </td>
                    <td className="px-4 py-2">
                      <DateRangeCell end={cycle.ends_at} start={cycle.starts_at} />
                    </td>
                    <td className="px-4 py-2">
                      <DateRangeCell end={cycle.review_ends_at} start={cycle.review_starts_at} />
                    </td>
                    <td className="px-4 py-2 tabular-nums">{formatUsd(cycle.budget_limit)}</td>
                    <td className="px-4 py-2">
                      {cycle.is_active ? (
                        'Active'
                      ) : (
                        <form action={setActiveCycleAction}>
                          <TabField tab={tab} />
                          <input name="cycle_id" type="hidden" value={cycle.id} />
                          <button
                            className="whitespace-nowrap text-eagle-blue underline"
                            type="submit"
                          >
                            Make active
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <FormDialog
                        description="Update this window's budget and dates."
                        padded={false}
                        title="Edit grant window"
                        triggerClassName="whitespace-nowrap text-eagle-blue underline"
                        triggerLabel="Edit"
                      >
                        <GrantWindowForm
                          action={updateCycleAction}
                          cycle={cycle}
                          reviewers={reviewersByCycle[cycle.id]}
                          submitLabel="Save window"
                          tab={tab}
                          users={users}
                          years={years}
                        />
                      </FormDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
