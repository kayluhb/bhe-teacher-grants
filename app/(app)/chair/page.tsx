import {GrantTable} from '~/components/grant-table';
import {requireChairman} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {listChairQueue} from '~/lib/grants';

export default async function ChairPage() {
  const user = await requireChairman();
  const grants = await listChairQueue(getDb(), user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">Chair</h1>
        <p className="font-body mt-1 text-gray-600">
          Grants whose required ballots are in. Record the official outcome, including overrides.
        </p>
      </div>
      <GrantTable grants={grants} hrefFor={(grant) => `/chair/${grant.id}`} showTeacher />
    </div>
  );
}
