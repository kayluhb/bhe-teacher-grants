'use client';

import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {Sidebar} from '~/components/sidebar';
import {TeacherNav} from '~/components/teacher-nav';
import {TourProvider} from '~/components/tour-provider';
import {ViewAsBanner} from '~/components/view-as-form';
import type {User} from '~/lib/auth';
import type {Portal} from '~/lib/reviewers';

export const AppShell = ({
  children,
  portals,
  user,
}: {
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
      <ViewAsBanner user={user} />
      <TeacherNav portals={portals} user={user} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-warm-white" id="main">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
    </div>
  ) : (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar portals={portals} user={user} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ViewAsBanner user={user} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-warm-white" id="main">
          <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );

  return <TourProvider role={user.role}>{shell}</TourProvider>;
};
