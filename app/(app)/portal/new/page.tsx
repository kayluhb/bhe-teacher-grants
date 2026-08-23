import {redirect} from 'next/navigation';
import {GrantForm} from '~/components/grant-form';
import {requireTeacher} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {isSubmissionOpen} from '~/lib/grant-cycle';
import {getActiveCycle} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.portalNew};

export default async function NewTeacherGrantPage() {
  const user = await requireTeacher();
  const cycle = await getActiveCycle(getDb());
  if (!cycle || !isSubmissionOpen(cycle)) redirect('/portal');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">New grant</h1>
        <p className="font-body mt-1 text-gray-600">{cycle.name}</p>
      </div>
      <GrantForm
        applicant={{email: user.email, name: user.name}}
        cycleId={cycle.id}
        cycleName={cycle.name}
      />
    </div>
  );
}
