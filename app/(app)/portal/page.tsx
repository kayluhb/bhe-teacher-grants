import Link from 'next/link';
import {GrantTable} from '~/components/grant-table';
import {requireTeacher} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {getActiveCycle, listGrants} from '~/lib/grants';

export default async function TeacherPortalPage() {
  const user = await requireTeacher();
  const db = getDb();
  const [grants, cycle] = await Promise.all([
    listGrants(db, {teacherId: user.id}),
    getActiveCycle(db),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal">My grants</h1>
          <p className="font-body mt-1 text-gray-600">
            Every request you have submitted, across years.
          </p>
        </div>
        {cycle ? (
          <Link className="btn btn-primary" href="/portal/new">
            Submit grant
          </Link>
        ) : null}
      </div>
      {cycle ? (
        <p className="rounded-xl border border-spirit-gold/40 bg-spirit-gold/15 px-4 py-3 text-sm text-night-blue">
          {cycle.name} is open for new requests.
        </p>
      ) : (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          No grant window is open right now. You can still read your past requests.
        </p>
      )}
      <GrantTable grants={grants} hrefFor={(grant) => `/portal/${grant.id}`} />
    </div>
  );
}
