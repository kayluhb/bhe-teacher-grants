'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAuth} from '~/lib/auth';
import {communityPath} from '~/lib/community';
import {saveCommunityPage} from '~/lib/community-page';
import {getDb} from '~/lib/db';

const editorPath = (cycleId: string, error?: string) => {
  const params = new URLSearchParams({cycle: cycleId});
  if (error) params.set('error', error);
  return `/community/edit?${params.toString()}`;
};

export const saveCommunityAction = async (formData: FormData) => {
  const user = await requireAuth();
  const cycleId = String(formData.get('cycle_id') || '');
  if (!cycleId) redirect('/community/edit?error=Choose%20a%20grant%20window.');

  const blurbs = [...formData.entries()]
    .filter(([key]) => key.startsWith('blurb_'))
    .map(([key, value]) => ({
      blurb: String(value),
      grantId: key.slice('blurb_'.length),
    }));

  const result = await saveCommunityPage(getDb(), {
    actor: user,
    blurbs,
    cycleId,
    intro: String(formData.get('intro') || ''),
    publish: formData.get('publish') === '1',
  });
  if ('error' in result) redirect(editorPath(cycleId, result.error));

  revalidatePath('/community/edit');
  revalidatePath(communityPath(cycleId));
  redirect(editorPath(cycleId));
};
