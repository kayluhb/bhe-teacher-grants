'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireReviewer} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {notifyQuietly} from '~/lib/email';
import {castVote, listReviewQueue, setApprovedAmount} from '~/lib/grants';
import {runReviewNotifications} from '~/lib/review-notifications';
import {isBallot, nextBallotHref} from '~/lib/votes';

export const castVoteAction = async (formData: FormData) => {
  const user = await requireReviewer();
  const vote = String(formData.get('vote') || '');
  if (!isBallot(vote)) {
    return {error: 'Invalid rank.'};
  }

  const grantId = String(formData.get('grant_id') || '');
  const db = getDb();
  const result = await castVote(db, {
    comment: String(formData.get('comment') || '') || null,
    grantId,
    vote,
    voter: user,
  });
  if ('error' in result) return result;

  if (result.complete) {
    await runReviewNotifications({
      db,
      now: new Date(),
      origin: process.env.APP_PUBLIC_URL || 'http://localhost:3000',
      send: notifyQuietly,
    });
  }

  const remaining = await listReviewQueue(db, user.id);
  revalidatePath('/review');
  revalidatePath(`/review/${grantId}`);
  revalidatePath('/chair');
  redirect(nextBallotHref(remaining, grantId));
};

export const setApprovedAmountAction = async (formData: FormData): Promise<void> => {
  const user = await requireReviewer();
  if (user.role !== 'admin') redirect('/review');
  const grantId = String(formData.get('grant_id') || '');
  const result = await setApprovedAmount(getDb(), {
    actor: user,
    amount: Number(formData.get('approved_amount') || 0),
    grantId,
  });
  if ('error' in result) {
    redirect(`/review/${grantId}?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath('/review');
  revalidatePath('/budget');
  redirect(`/review/${grantId}`);
};
