'use server';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getSession} from '~/lib/auth';
import {homePathForPortals} from '~/lib/portals';
import {
  canManageViewAs,
  parseViewAsRole,
  portalsForViewAs,
  VIEW_AS_COOKIE,
  VIEW_AS_MAX_AGE,
} from '~/lib/view-as';

export const setViewAsAction = async (formData: FormData): Promise<void> => {
  const user = await getSession();
  if (!user || !canManageViewAs(user)) redirect('/');

  const cookieStore = await cookies();
  const raw = String(formData.get('role') || '');

  if (!raw || raw === 'admin') {
    cookieStore.delete(VIEW_AS_COOKIE);
    redirect('/');
  }

  const role = parseViewAsRole(raw);
  if (!role) redirect('/');

  cookieStore.set(VIEW_AS_COOKIE, role, {
    httpOnly: true,
    maxAge: VIEW_AS_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  redirect(homePathForPortals({...user, role}, portalsForViewAs(role)));
};
