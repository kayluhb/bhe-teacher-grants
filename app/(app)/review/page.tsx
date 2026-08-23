import {TourGrantTable} from '~/components/tour-grant-table';
import {requireReviewer} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {listReviewQueue} from '~/lib/grants';

export default async function ReviewPage() {
  const user = await requireReviewer();
  const grants = await listReviewQueue(getDb(), user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
          Review
        </h1>
        <p className="font-body mt-1 text-gray-600">
          Grants you still need to vote on. After you submit a ballot, the next grant opens.
        </p>
      </div>
      <TourGrantTable grants={grants} hrefBase="/review" queue="reviewer" showTeacher />
    </div>
  );
}
