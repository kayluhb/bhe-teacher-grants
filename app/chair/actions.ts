'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {addCommitteeMember, removeCommitteeMember} from '~/lib/admin';
import {teacherGrantDecisionEmail} from '~/lib/approval-email';
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
    const email = teacherGrantDecisionEmail({
      amount: grant.approved_amount ?? grant.requested_amount,
      chairmanEmail: user.email,
      chairmanName: user.name,
      outcome: result.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      rejectionComment: result.status === 'REJECTED' ? comment : null,
      teacherEmail: grant.teacher_email,
      teacherName: grant.teacher_name,
      title: grant.title,
    });
    notifyQuietly(email);
  }

  const remaining = await listChairQueue(db, user.id);
  revalidatePath('/chair');
  revalidatePath('/review');
  revalidatePath('/grants');
  revalidatePath('/portal');
  redirect(remaining[0] ? `/chair/${remaining[0].id}` : '/chair');
};

const requireChairOfCycle = async (cycleId: string) => {
  const user = await requireChairman();
  const row = await getDb()
    .prepare(
      `SELECT user_id FROM cycle_reviewers
       WHERE cycle_id = ? AND user_id = ? AND seat = 'chairman'`,
    )
    .bind(cycleId, user.id)
    .first();
  if (!row) return {error: 'You can only edit a committee you chair.'} as const;
  return user;
};

export const addCommitteeMemberAction = async (cycleId: string, email: string, name?: string) => {
  const chair = await requireChairOfCycle(cycleId);
  if ('error' in chair) return chair;
  const result = await addCommitteeMember(getDb(), {cycleId, email, name});
  if ('error' in result) return result;
  revalidatePath('/chair');
  revalidatePath('/admin');
  revalidatePath('/review');
  return result;
};

export const removeCommitteeMemberAction = async (cycleId: string, userId: string) => {
  const chair = await requireChairOfCycle(cycleId);
  if ('error' in chair) return chair;
  const result = await removeCommitteeMember(getDb(), {cycleId, userId});
  if ('error' in result) return result;
  revalidatePath('/chair');
  revalidatePath('/admin');
  revalidatePath('/review');
  return result;
};
