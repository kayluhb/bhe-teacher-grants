import {EmptyCopy} from '~/components/grant-table';
import {TourGrantTable} from '~/components/tour-grant-table';
import {requireReviewer} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {reviewQueueMessaging, reviewWindowState} from '~/lib/grant-cycle';
import {listReviewerCycles, listReviewQueue} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.review};

export default async function ReviewPage() {
  const user = await requireReviewer();
  const db = getDb();
  const [grants, cycles] = await Promise.all([
    listReviewQueue(db, user.id),
    listReviewerCycles(db, user.id),
  ]);
  const copy = reviewQueueMessaging(reviewWindowState(cycles));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
          Review
        </h1>
        <p className="font-body mt-1 text-gray-600">{copy.subtitle}</p>
      </div>
      <TourGrantTable
        empty={<EmptyCopy paragraphs={copy.paragraphs} />}
        grants={grants}
        hrefBase="/review"
        queue="reviewer"
        showTeacher
      />
    </div>
  );
}
