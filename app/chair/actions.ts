'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireChairman} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {notifyQuietly} from '~/lib/email';
import {decideGrant, getGrant, listChairQueue} from '~/lib/grants';

export const decideGrantAction = async (formData: FormData) => {
  const user = await requireChairman();
  const outcome = String(formData.get('outcome') || '');
  if (outcome !== 'APPROVED' && outcome !== 'REJECTED') {
    return {error: 'Choose approve or reject.'};
  }

  const grantId = String(formData.get('grant_id') || '');
  const comment = String(formData.get('comment') || '') || null;
  const db = getDb();
  const result = await decideGrant(db, {
    chairman: user,
    comment,
    grantId,
    outcome,
  });
  if ('error' in result) return result;

  const grant = await getGrant(db, grantId);
  if (grant) {
    notifyQuietly({
      html: `<p>Your grant “${grant.title}” is now ${result.status.toLowerCase()}.</p>`,
      subject: `Grant ${result.status.toLowerCase()}`,
      to: grant.teacher_email,
    });
  }

  const remaining = await listChairQueue(db, user.id);
  revalidatePath('/chair');
  revalidatePath('/review');
  revalidatePath('/grants');
  revalidatePath('/portal');
  redirect(remaining[0] ? `/chair/${remaining[0].id}` : '/chair');
};
