import {ChairCommittee} from '~/components/chair-committee';
import {TourGrantTable} from '~/components/tour-grant-table';
import {listCycleReviewers, listUsers} from '~/lib/admin';
import {requireChairman} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {listChairCycles, listChairQueue} from '~/lib/grants';
import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';

export default async function ChairPage() {
  const user = await requireChairman();
  const db = getDb();
  const [grants, cycles, users] = await Promise.all([
    listChairQueue(db, user.id),
    listChairCycles(db, user.id),
    listUsers(db),
  ]);
  const people = users.map((row) => ({email: row.email, id: row.id, name: row.name}));
  const windows = await Promise.all(
    cycles.map(async (cycle) => ({
      cycle,
      reviewers: await listCycleReviewers(db, cycle.id),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
          Chair
        </h1>
        <p className="font-body mt-1 text-gray-600">
          Grants whose required ballots are in. Record the official outcome, including overrides.
        </p>
      </div>
      {windows.map(({cycle, reviewers}) => {
        const committee = reviewers
          .filter((row) => row.seat === 'committee')
          .map((row) => ({email: row.email, id: row.user_id, name: row.name}));
        const officerIds = reviewers
          .filter((row) => row.seat !== 'committee')
          .map((row) => row.user_id);
        return (
          <ChairCommittee
            cycleId={cycle.id}
            cycleLabel={`${semesterLabel(cycle.semester)} ${formatSchoolYearLong(cycle.school_year)}`}
            key={cycle.id}
            officerIds={officerIds}
            people={people}
            selected={committee}
          />
        );
      })}
      <TourGrantTable grants={grants} hrefBase="/chair" queue="chairman" showTeacher />
    </div>
  );
}
