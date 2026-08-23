import Link from 'next/link';
import {
  createCycleAction,
  createSchoolYearAction,
  setActiveCycleAction,
  updateCycleAction,
  updateUserRoleAction,
} from '~/admin/actions';
import {FormDialog} from '~/components/form-dialog';
import {GrantWindowForm} from '~/components/grant-window-form';
import {listCycleReviewers, listUsers} from '~/lib/admin';
import {ASSIGNABLE_ROLES, ROLE_LABELS, requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {listCycles, listSchoolYears} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
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

const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2';

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
          <p className="text-sm text-gray-600">
            People appear here after they sign in. AISD emails are teachers except
            kathryn.achtermann@austinisd.org (principal). BHE emails are committee except
            treasurer@bheeagles.com.
          </p>
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
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      {user.role === 'principal' ? (
                        <span>{ROLE_LABELS.principal}</span>
                      ) : (
                        <form action={updateUserRoleAction} className="flex gap-2">
                          <TabField tab={tab} />
                          <input name="user_id" type="hidden" value={user.id} />
                          <select
                            className="rounded-lg border border-gray-300 px-2 py-1"
                            defaultValue={user.role}
                            name="role"
                          >
                            {ASSIGNABLE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <button
                            className="whitespace-nowrap text-sm text-eagle-blue underline"
                            type="submit"
                          >
                            Save
                          </button>
                        </form>
                      )}
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
              title="Add school year"
              triggerLabel="Add year"
            >
              <form action={createSchoolYearAction} className="grid gap-3">
                <TabField tab={tab} />
                <label className="block text-sm font-medium text-charcoal">
                  Label
                  <input
                    className={`mt-1 ${fieldClass}`}
                    name="label"
                    placeholder="2026-27"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-charcoal">
                  Starts
                  <input className={`mt-1 ${fieldClass}`} name="starts_on" required type="date" />
                </label>
                <label className="block text-sm font-medium text-charcoal">
                  Ends
                  <input className={`mt-1 ${fieldClass}`} name="ends_on" required type="date" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="is_default" type="checkbox" value="1" />
                  Current year
                </label>
                <button className="btn btn-brand" type="submit">
                  Add year
                </button>
              </form>
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
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr className="border-t border-gray-100" key={year.id}>
                    <td className="px-4 py-2">{formatSchoolYearLong(year.label)}</td>
                    <td className="px-4 py-2">{year.starts_on}</td>
                    <td className="px-4 py-2">{year.ends_on}</td>
                    <td className="px-4 py-2">{year.is_default ? 'Current' : ''}</td>
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
