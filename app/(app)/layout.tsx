import {AppShell} from '~/components/app-shell';
import {requireAuth} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {listPortals} from '~/lib/portals';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await requireAuth();
  const portals = await listPortals(getDb(), user);

  return (
    <AppShell portals={portals} user={user}>
      {children}
    </AppShell>
  );
}
