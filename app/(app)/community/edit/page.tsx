import {headers} from 'next/headers';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {saveCommunityAction} from '~/community/actions';
import {CopyButton} from '~/components/copy-button';
import {requireAuth} from '~/lib/auth';
import {canPrepareCommunityPage, communityDescription, communityPath} from '~/lib/community';
import {getCommunityCycle, listCommunityGrants, listEditableCycles} from '~/lib/community-page';
import {getDb} from '~/lib/db';
import {listUserSeats} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import {homePath} from '~/lib/roles';

export const metadata = {title: DOCUMENT_TITLES.community};

const fieldClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

const publicUrl = async (cycleId: string) => {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') ?? 'https';
  const path = communityPath(cycleId);
  return host ? `${proto}://${host}${path}` : path;
};

export default async function CommunityEditPage({
  searchParams,
}: {
  searchParams: Promise<{cycle?: string | string[]; error?: string | string[]}>;
}) {
  const user = await requireAuth();
  const db = getDb();
  const seats = await listUserSeats(db, user.id);
  if (!canPrepareCommunityPage(user, seats.includes('chairman'))) redirect(homePath(user.role));

  const params = await searchParams;
  const cycles = await listEditableCycles(db, user);
  const requested = Array.isArray(params.cycle) ? params.cycle[0] : params.cycle;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const cycleId = cycles.some((cycle) => cycle.id === requested) ? requested : cycles[0]?.id;
  const cycle = cycleId ? await getCommunityCycle(db, cycleId) : null;
  const grants = cycle ? await listCommunityGrants(db, cycle.id) : [];
  const link = cycle ? await publicUrl(cycle.id) : '';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">Community page</h1>
        <p className="font-body mt-1 text-gray-600">
          This is the page the newsletter can link to. It stays private until you publish it. Edits
          here do not change a teacher’s application.
        </p>
      </div>

      {cycles.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {cycles.map((item) => (
            <li key={item.id}>
              <Link
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  item.id === cycle?.id
                    ? 'bg-eagle-blue text-white'
                    : 'bg-white text-eagle-blue ring-1 ring-eagle-blue/30'
                }`}
                href={`/community/edit?cycle=${item.id}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {cycle ? (
        <form action={saveCommunityAction} className="space-y-8">
          <input name="cycle_id" type="hidden" value={cycle.id} />
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                {cycle.community_published_at
                  ? 'Published. The newsletter can use this link.'
                  : 'Not published yet. The link will work after you publish.'}
              </p>
              <CopyButton text={link} />
            </div>
            <p className="break-all font-mono text-xs text-gray-500">{link}</p>
            <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
              <input
                defaultChecked={Boolean(cycle.community_published_at)}
                name="publish"
                type="checkbox"
                value="1"
              />
              Publish this page
            </label>
            <label className="font-body block text-sm text-charcoal">
              Intro
              <span className="mt-0.5 block font-normal text-gray-500">
                A short note at the top for families. Leave it blank to show only the grants.
              </span>
              <textarea
                className={fieldClass}
                defaultValue={cycle.community_intro}
                name="intro"
                rows={4}
              />
            </label>
          </section>

          {grants.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              Approved grants show up here. Denied, voting, and draft requests stay off the page.
            </p>
          ) : (
            grants.map((grant) => (
              <section
                className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
                key={grant.id}
              >
                <div>
                  <h2 className="font-heading text-xl font-semibold text-charcoal">
                    {grant.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {grant.teacher_name}
                    {grant.grade_level_subject.trim()
                      ? ` · ${grant.grade_level_subject.trim()}`
                      : ''}
                  </p>
                </div>
                <label className="font-body block text-sm text-charcoal">
                  Description for families
                  <textarea
                    className={fieldClass}
                    defaultValue={communityDescription(grant)}
                    name={`blurb_${grant.id}`}
                    rows={6}
                  />
                </label>
                {grant.items.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-charcoal">What it funds</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {grant.items.map((item) => (
                        <li key={`${grant.id}:${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ))
          )}

          <button className="btn btn-primary" type="submit">
            Save community page
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-600">No grant window is available to share yet.</p>
      )}
    </div>
  );
}
