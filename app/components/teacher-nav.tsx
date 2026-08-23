'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {TourHelpButton} from '~/components/tour-help-button';
import type {Portal} from '~/lib/reviewers';
import {ROLE_LABELS, type User} from '~/lib/roles';

export const TeacherNav = ({
  canSubmit,
  portals,
  user,
}: {
  canSubmit: boolean;
  portals?: Portal[];
  user: User;
}) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    {href: '/portal', label: 'My grants'},
    ...(canSubmit ? [{href: '/portal/new', label: 'Submit grant'}] : []),
    ...(portals?.includes('reviewer') ? [{href: '/review', label: 'Review'}] : []),
    ...(portals?.includes('chairman') ? [{href: '/chair', label: 'Chair'}] : []),
  ];

  const nav = (
    <nav className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
      {links.map((link) => {
        const active =
          pathname === link.href || (link.href !== '/portal' && pathname?.startsWith(link.href));
        return (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              active
                ? 'bg-white text-eagle-blue'
                : 'text-white/85 hover:bg-white/10 hover:text-white'
            }`}
            data-tour={link.href === '/review' ? 'nav-review' : undefined}
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
    <header className="shrink-0 bg-gradient-to-r from-eagle-blue to-night-blue text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="font-heading text-lg font-bold leading-tight">My teacher grants</p>
          <p className="font-body text-xs text-white/85">Barton Hills Elementary PTA</p>
        </div>
        <div className="hidden md:block">{nav}</div>
        <div className="hidden items-center gap-4 md:flex">
          <TourHelpButton />
          <div className="text-right">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-white/85">{ROLE_LABELS[user.role]}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="text-xs text-white/85 underline hover:text-white" type="submit">
              Sign out
            </button>
          </form>
        </div>
        <button
          aria-expanded={open}
          aria-label="Open menu"
          className="rounded p-1 hover:bg-white/10 md:hidden"
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
        <div className="space-y-4 border-t border-white/10 px-4 py-4 md:hidden">
          {nav}
          <div className="border-t border-white/10 pt-3">
            <p className="text-sm font-medium">{user.name}</p>
            <div className="mt-3">
              <TourHelpButton />
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="mt-2 text-xs text-white/85 underline" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
};
