import {notFound} from 'next/navigation';
import {GrantDetail} from '~/components/grant-detail';
import {getSession, requireTeacher} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {getCycle, getGrant, listGrantItems} from '~/lib/grants';
import {GRANT_TITLE_SECTIONS, grantDocumentTitle} from '~/lib/page-title';

export const generateMetadata = async ({params}: {params: Promise<{id: string}>}) => {
  const section = GRANT_TITLE_SECTIONS.portal;
  const user = await getSession();
  if (!user) return {title: grantDocumentTitle(section)};
  const grant = await getGrant(getDb(), (await params).id);
  if (!grant || grant.teacher_id !== user.id) return {title: grantDocumentTitle(section)};
  return {title: grantDocumentTitle(section, grant.title)};
};

export default async function TeacherGrantDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireTeacher();
  const {id} = await params;
  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant || grant.teacher_id !== user.id) notFound();

  const [items, cycle] = await Promise.all([listGrantItems(db, id), getCycle(db, grant.cycle_id)]);

  return <GrantDetail backHref="/portal" cycle={cycle} grant={grant} items={items} />;
}
