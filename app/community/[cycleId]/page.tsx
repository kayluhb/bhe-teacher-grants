import {notFound} from 'next/navigation';
import {HeaderLogo} from '~/components/header-logo';
import {communityDescription} from '~/lib/community';
import {loadPublishedCommunity} from '~/lib/community-page';
import {getDb} from '~/lib/db';
import {grantDocumentTitle} from '~/lib/page-title';

export const generateMetadata = async ({params}: {params: Promise<{cycleId: string}>}) => {
  const cycle = await loadPublishedCommunity(getDb(), (await params).cycleId);
  return {title: grantDocumentTitle('Community', cycle?.cycle.name)};
};

export default async function CommunityPage({params}: {params: Promise<{cycleId: string}>}) {
  const page = await loadPublishedCommunity(getDb(), (await params).cycleId);
  if (!page) notFound();
  const {cycle, grants} = page;

  return (
    <div className="flex min-h-screen flex-col bg-warm-white">
      <header className="bg-eagle-blue text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <a className="min-w-0" href="https://bheeagles.com">
            <HeaderLogo />
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10" id="main">
        <p className="font-body text-sm font-semibold tracking-wide text-eagle-blue uppercase">
          Barton Hills Elementary PTA
        </p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-charcoal">{cycle.name}</h1>
        {cycle.community_intro.trim() ? (
          <p className="font-body mt-4 whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
            {cycle.community_intro.trim()}
          </p>
        ) : null}

        {grants.length === 0 ? (
          <p className="font-body mt-10 text-gray-600">Approved grants will be listed here.</p>
        ) : (
          <div className="mt-10 space-y-10">
            {grants.map((grant) => (
              <article className="border-t border-spirit-gold/60 pt-8" key={grant.id}>
                <h2 className="font-heading text-2xl font-semibold text-charcoal">{grant.title}</h2>
                <p className="font-body mt-1 text-sm text-gray-600">
                  {grant.teacher_name}
                  {grant.grade_level_subject.trim() ? ` · ${grant.grade_level_subject.trim()}` : ''}
                </p>
                <p className="font-body mt-4 whitespace-pre-wrap text-base leading-relaxed text-charcoal">
                  {communityDescription(grant)}
                </p>
                {grant.items.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="font-body text-sm font-semibold text-charcoal">What it funds</h3>
                    <ul className="font-body mt-2 list-disc space-y-1 pl-5 text-gray-700">
                      {grant.items.map((item) => (
                        <li key={`${grant.id}:${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
