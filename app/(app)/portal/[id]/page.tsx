import {notFound} from 'next/navigation';
import {GrantDetail} from '~/components/grant-detail';
import {requireTeacher} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {getActiveCycle, getGrant, listGrantItems} from '~/lib/grants';

export default async function TeacherGrantDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireTeacher();
  const {id} = await params;
  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant || grant.teacher_id !== user.id) notFound();

  const [items, cycle] = await Promise.all([listGrantItems(db, id), getActiveCycle(db)]);

  return <GrantDetail backHref="/portal" cycle={cycle} grant={grant} items={items} />;
}
