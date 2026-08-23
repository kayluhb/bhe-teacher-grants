import {AppShell} from '~/components/app-shell';
import {requireAuth} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {isSubmissionOpen} from '~/lib/grant-cycle';
import {getActiveCycle} from '~/lib/grants';
import {listPortals} from '~/lib/portals';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await requireAuth();
  const db = getDb();
  const [cycle, portals] = await Promise.all([getActiveCycle(db), listPortals(db, user)]);
  const canSubmit = Boolean(cycle && isSubmissionOpen(cycle));

  return (
    <AppShell canSubmit={canSubmit} portals={portals} user={user}>
      {children}
    </AppShell>
  );
}
