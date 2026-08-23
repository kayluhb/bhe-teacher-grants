'use client';

import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {Sidebar} from '~/components/sidebar';
import {TeacherNav} from '~/components/teacher-nav';
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

  if (teacherChrome) {
    return (
      <div className="flex min-h-full flex-col">
        <TeacherNav canSubmit={canSubmit} portals={portals} user={user} />
        <main className="flex-1 bg-warm-white" id="main">
          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar portals={portals} user={user} />
      <main className="flex-1 overflow-auto bg-warm-white" id="main">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
};
