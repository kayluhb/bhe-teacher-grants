'use server';

import {env} from 'cloudflare:workers';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAuth, requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {notifyQuietly} from '~/lib/email';
import {deleteGrantFiles} from '~/lib/grant-files';
import {confirmDelivery, deleteGrant, saveGrant} from '~/lib/grants';
import {escapeHtml} from '~/lib/html';
import {grantPath} from '~/lib/roles';
import type {GrantItemInput} from '~/lib/types';

const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readGrantForm = (formData: FormData) => {
  const items = parseJson<GrantItemInput[]>(String(formData.get('items') || '[]'), []);
  const grantId = String(formData.get('grant_id') || '') || undefined;
  return {
    benefitScope: String(formData.get('benefit_scope') || ''),
    cycleId: String(formData.get('cycle_id') || ''),
    description: String(formData.get('description') || ''),
    gradesImpacted: String(formData.get('grades_impacted') || ''),
    grantId,
    items,
    wishlistUrl: String(formData.get('wishlist_url') || '') || null,
  };
};

export const saveGrantAction = async (formData: FormData) => {
  const user = await requireRole('teacher');
  const fields = readGrantForm(formData);
  const submit = String(formData.get('submit') || '') === '1';

  const result = await saveGrant(getDb(), {
    actor: user,
    ...fields,
    submit,
  });

  if ('error' in result) return result;

  revalidatePath('/grants');
  revalidatePath('/portal');
  redirect(grantPath(user.role, result.grantId));
};

/** Silent draft save for the guided form — no redirect. */
export const saveGrantDraftAction = async (formData: FormData) => {
  const user = await requireRole('teacher');
  const fields = readGrantForm(formData);

  const result = await saveGrant(getDb(), {
    actor: user,
    ...fields,
    submit: false,
  });

  if ('error' in result) return result;

  revalidatePath('/grants');
  revalidatePath('/portal');
  return {grantId: result.grantId};
};

export const deleteGrantAction = async (formData: FormData): Promise<void> => {
  const user = await requireAuth();
  const grantId = String(formData.get('grant_id') || '');
  const home = user.role === 'teacher' ? '/portal' : '/grants';

  const result = await deleteGrant(getDb(), {actor: user, grantId});
  if ('error' in result) {
    redirect(`${grantPath(user.role, grantId)}?error=${encodeURIComponent(result.error)}`);
  }

  await deleteGrantFiles(env.FILES_BUCKET, result.fileKeys);
  revalidatePath('/grants');
  revalidatePath('/portal');
  revalidatePath('/review');
  revalidatePath('/chair');
  revalidatePath('/fulfill');
  revalidatePath('/budget');
  redirect(home);
};

export const confirmDeliveryAction = async (formData: FormData) => {
  const user = await requireAuth();
  const result = await confirmDelivery(getDb(), {
    actor: user,
    grantId: String(formData.get('grant_id') || ''),
    proofKey: String(formData.get('proof_of_delivery_r2_key') || '') || null,
  });
  if ('error' in result) return result;

  const treasurer = await getDb()
    .prepare("SELECT email FROM users WHERE role = 'admin'")
    .all<{email: string}>();
  notifyQuietly({
    html: `<p>${escapeHtml(user.name)} confirmed delivery.</p>`,
    subject: 'Grant delivery confirmed',
    to: (treasurer.results ?? []).map((row) => row.email),
  });

  revalidatePath('/grants');
  revalidatePath('/portal');
  revalidatePath('/fulfill');
  revalidatePath('/budget');
  redirect(grantPath(user.role, String(formData.get('grant_id') || '')));
};
