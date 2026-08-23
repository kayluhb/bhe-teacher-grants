import {redirect} from 'next/navigation';
import {GrantDetail} from '~/components/grant-detail';
import {requireAuth} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {getCycle, getGrant, listGrantItems} from '~/lib/grants';
import {GRANT_TITLE_SECTIONS, grantDocumentTitle} from '~/lib/page-title';

export const generateMetadata = async ({params}: {params: Promise<{id: string}>}) => {
  const grant = await getGrant(getDb(), (await params).id);
  return {title: grantDocumentTitle(GRANT_TITLE_SECTIONS.grants, grant?.title)};
};

export default async function GrantDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireAuth();
  const {id} = await params;
  if (user.role === 'teacher') redirect(`/portal/${id}`);

  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant) redirect('/grants');
  if (user.role !== 'admin' && grant.teacher_id !== user.id) redirect('/grants');

  const [items, cycle] = await Promise.all([listGrantItems(db, id), getCycle(db, grant.cycle_id)]);

  return <GrantDetail backHref="/grants" cycle={cycle} grant={grant} items={items} />;
}
