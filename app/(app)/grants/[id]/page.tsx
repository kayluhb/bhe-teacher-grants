import {redirect} from 'next/navigation';
import {GrantDetail} from '~/components/grant-detail';
import {requireAuth} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {getActiveCycle, getGrant, listGrantItems} from '~/lib/grants';

export default async function GrantDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireAuth();
  const {id} = await params;
  if (user.role === 'teacher') redirect(`/portal/${id}`);

  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant) redirect('/grants');
  if (user.role !== 'admin' && grant.teacher_id !== user.id) redirect('/grants');

  const [items, cycle] = await Promise.all([listGrantItems(db, id), getActiveCycle(db)]);

  return <GrantDetail backHref="/grants" cycle={cycle} grant={grant} items={items} />;
}
