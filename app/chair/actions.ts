'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {
  addCommitteeMember,
  createCycle,
  removeCommitteeMember,
  setActiveCycle,
  updateCycle,
} from '~/lib/admin';
import {teacherGrantDecisionEmail} from '~/lib/approval-email';
import {requireChairman} from '~/lib/auth';
import {isChairManualStepId, setManualProcessStep} from '~/lib/chair-process-status';
import {getDb} from '~/lib/db';
import {notifyQuietly, sendEmail} from '~/lib/email';
import {buildEvaluationInstructionsEmail, evaluationVoterEmails} from '~/lib/evaluation-email';
import {cycleInputFromFormData} from '~/lib/grant-cycle';
import {decideGrant, getGrant, listChairQueue, listReviewerRows} from '~/lib/grants';
import type {CycleRow} from '~/lib/types';

export type ChairFormState = {error?: string};

const toChairWindows = (error?: string): never => {
  redirect(error ? `/chair/windows?error=${encodeURIComponent(error)}` : '/chair/windows');
};

export const createCycleAction = async (
  _prev: ChairFormState,
  formData: FormData,
): Promise<ChairFormState> => {
  await requireChairman();
  const result = await createCycle(getDb(), cycleInputFromFormData(formData));
  if ('error' in result) return {error: result.error};
  revalidatePath('/chair');
  revalidatePath('/chair/windows');
  revalidatePath('/admin');
  return toChairWindows();
};

export const updateCycleAction = async (
  _prev: ChairFormState,
  formData: FormData,
): Promise<ChairFormState> => {
  await requireChairman();
  const result = await updateCycle(getDb(), {
    ...cycleInputFromFormData(formData),
    cycleId: String(formData.get('cycle_id') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/chair');
  revalidatePath('/chair/windows');
  revalidatePath('/admin');
  revalidatePath('/grants');
  return toChairWindows();
};

export const setActiveCycleAction = async (formData: FormData): Promise<void> => {
  await requireChairman();
  const result = await setActiveCycle(getDb(), String(formData.get('cycle_id') || ''));
  if ('error' in result) toChairWindows(result.error);
  revalidatePath('/chair');
  revalidatePath('/chair/windows');
  revalidatePath('/admin');
  revalidatePath('/grants');
  redirect('/chair/windows');
};

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

  const remaining = await listChairQueue(db, user);
  revalidatePath('/chair');
  revalidatePath('/review');
  revalidatePath('/grants');
  revalidatePath('/portal');
  redirect(remaining[0] ? `/chair/${remaining[0].id}` : '/chair');
};

export type EvaluationEmailState = {error?: string; sent?: number};

export const sendEvaluationInstructionsAction = async (
  _prev: EvaluationEmailState,
  formData: FormData,
): Promise<EvaluationEmailState> => {
  const user = await requireChairman();
  const cycleId = String(formData.get('cycle_id') || '');
  if (!cycleId) return {error: 'Choose a grant window first.'};

  const chair = await requireChairOfCycle(cycleId);
  if ('error' in chair) return chair;

  const db = getDb();
  const cycle = await db
    .prepare(
      `SELECT c.*, y.label AS school_year
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       WHERE c.id = ?`,
    )
    .bind(cycleId)
    .first<CycleRow>();
  if (!cycle) return {error: 'Grant window not found.'};

  const reviewers = await listReviewerRows(db, cycleId);
  const to = evaluationVoterEmails(reviewers);
  const stats = await db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(requested_amount), 0) AS total
       FROM grants
       WHERE cycle_id = ? AND status = 'PENDING'`,
    )
    .bind(cycleId)
    .first<{count: number; total: number}>();
  const principal = reviewers.find((row) => row.seat === 'principal');

  const email = buildEvaluationInstructionsEmail({
    applicationCount: Number(stats?.count ?? 0),
    budgetLimit: cycle.budget_limit,
    chairmanEmail: user.email,
    principalName: principal?.name ?? '',
    requestedTotal: Number(stats?.total ?? 0),
    reviewEndsAt: cycle.review_ends_at,
    schoolYear: cycle.school_year,
    semester: cycle.semester,
    to,
  });
  if ('error' in email) return email;

  const sent = await sendEmail(email);
  if (!sent) {
    return {error: 'Could not send the email. Try again or copy the template below.'};
  }
  return {sent: email.to.length};
};

const requireChairOfCycle = async (cycleId: string) => {
  const user = await requireChairman();
  if (user.role === 'chair') return user;
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

export const setManualProcessStepAction = async (formData: FormData): Promise<void> => {
  await requireChairman();
  const cycleId = String(formData.get('cycle_id') || '');
  const stepId = String(formData.get('step_id') || '');
  const done = String(formData.get('done') || '') === '1';
  if (!cycleId) redirect('/chair');
  if (!isChairManualStepId(stepId)) {
    redirect(`/chair?error=${encodeURIComponent('Unknown playbook step.')}`);
  }

  const chair = await requireChairOfCycle(cycleId);
  if ('error' in chair) {
    redirect(`/chair?error=${encodeURIComponent(chair.error)}`);
  }

  const result = await setManualProcessStep(getDb(), {cycleId, done, stepId});
  if ('error' in result) {
    redirect(`/chair?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath('/chair');
  redirect('/chair');
};
