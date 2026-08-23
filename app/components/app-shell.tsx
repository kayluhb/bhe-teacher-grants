'use client';

import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {Sidebar} from '~/components/sidebar';
import {TeacherNav} from '~/components/teacher-nav';
import {TourProvider} from '~/components/tour-provider';
import type {User} from '~/lib/auth';
import type {Portal} from '~/lib/reviewers';

export const AppShell = ({
  canSubmit,
  children,
  portals,
  user,
}: {
  canSubmit: boolean;
  children: ReactNode;
  portals: Portal[];
  user: User;
}) => {
  const pathname = usePathname() ?? '/';
  const teacherChrome =
    pathname.startsWith('/portal') ||
    (user.role === 'teacher' && !pathname.startsWith('/review') && !pathname.startsWith('/chair'));

  const shell = teacherChrome ? (
    <div className="flex h-full flex-col">
      <TeacherNav canSubmit={canSubmit} portals={portals} user={user} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-warm-white" id="main">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
    </div>
  ) : (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar portals={portals} user={user} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-warm-white" id="main">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </main>
    </div>
  );

  return <TourProvider>{shell}</TourProvider>;
};
