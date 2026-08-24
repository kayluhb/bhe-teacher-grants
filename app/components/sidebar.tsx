'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {HeaderLogo} from '~/components/header-logo';
import {TourHelpButton} from '~/components/tour-help-button';
import {APP_TITLE} from '~/lib/page-title';
import type {Portal} from '~/lib/reviewers';
import {displayRoleLabel, type Role, type User} from '~/lib/roles';

const LINKS: {href: string; label: string; roles: Role[]}[] = [
  {href: '/', label: 'Home', roles: ['committee', 'admin', 'principal']},
  {href: '/grants', label: 'Grants', roles: ['admin']},
  {href: '/review', label: 'Review', roles: ['committee', 'admin', 'principal']},
  {href: '/fulfill', label: 'Fulfill', roles: ['admin']},
  {href: '/budget', label: 'Budget', roles: ['committee', 'admin', 'principal']},
  {href: '/admin', label: 'Admin', roles: ['admin']},
];

export const Sidebar = ({portals, user}: {portals?: Portal[]; user: User}) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    ...LINKS.filter((link) => {
      if (link.href === '/review') return Boolean(portals?.includes('reviewer'));
      return user.role === 'admin' || link.roles.includes(user.role);
    }),
    ...(portals?.includes('reviewer') && user.role === 'teacher'
      ? [{href: '/review', label: 'Review'}]
      : []),
    ...(portals?.includes('chairman') ? [{href: '/chair', label: 'Chair'}] : []),
    ...(portals?.includes('teacher') ? [{href: '/portal', label: 'My grants'}] : []),
  ].filter((link, index, list) => list.findIndex((item) => item.href === link.href) === index);

  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {links.map((link) => {
        const active =
          pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
        return (
          <Link
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            href={link.href}
            key={link.href}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex h-16 items-center justify-between bg-eagle-blue px-4 text-white md:hidden">
        <Link aria-label="Barton Hills Elementary PTA home" className="min-w-0" href="/">
          <HeaderLogo compact />
        </Link>
        <button
          aria-expanded={open}
          aria-label="Open menu"
          className="rounded p-1 hover:bg-white/10"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d={open ? 'M6 18 18 6M6 6l12 12' : 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
            />
          </svg>
        </button>
      </div>

      {open ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-eagle-blue text-white transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-5">
          <Link aria-label="Barton Hills Elementary PTA home" className="block min-w-0" href="/">
            <HeaderLogo compact />
          </Link>
          <p className="font-body mt-2 text-xs text-white/85">{APP_TITLE}</p>
        </div>
        {nav}
        <div className="mt-auto border-t border-white/10 px-5 py-4">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-white/85">{displayRoleLabel(user, portals)}</p>
          <div className="mt-3">
            <TourHelpButton />
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="mt-3 text-xs text-white/85 underline hover:text-white" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
};
