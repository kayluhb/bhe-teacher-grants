import {EmptyCopy, GrantTable} from '~/components/grant-table';
import {TourGrantTable} from '~/components/tour-grant-table';
import {requireReviewer} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {reviewQueueMessaging, reviewWindowState} from '~/lib/grant-cycle';
import {listReviewerCycles, listReviewQueue, type ReviewQueueGrant} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import {splitReviewQueue} from '~/lib/votes';

export const metadata = {title: DOCUMENT_TITLES.review};

export default async function ReviewPage() {
  const user = await requireReviewer();
  const db = getDb();
  const [grants, cycles] = await Promise.all([
    listReviewQueue(db, user.id),
    listReviewerCycles(db, user.id),
  ]);
  const {pending, ranked} = splitReviewQueue(grants);
  const copy = reviewQueueMessaging(reviewWindowState(cycles));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
          Review
        </h1>
        <p className="font-body mt-1 text-gray-600">{copy.subtitle}</p>
      </div>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold text-charcoal">Still need your rank</h2>
        <TourGrantTable
          empty={<EmptyCopy paragraphs={copy.paragraphs} />}
          grants={pending}
          hrefBase="/review"
          queue="reviewer"
          showTeacher
        />
      </section>
      {ranked.length > 0 ? (
        <section className="space-y-3" data-tour="ranked-section">
          <h2 className="font-heading text-xl font-semibold text-charcoal">Already ranked</h2>
          <GrantTable
            grants={ranked}
            hrefFor={(grant) => `/review/${grant.id}`}
            myVote={(grant) => (grant as ReviewQueueGrant).my_vote}
            showTeacher
          />
        </section>
      ) : null}
    </div>
  );
}
