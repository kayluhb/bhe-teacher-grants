'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAuth, requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {notifyQuietly} from '~/lib/email';
import {confirmDelivery, saveGrant} from '~/lib/grants';
import {grantPath} from '~/lib/roles';
import type {GrantItemInput} from '~/lib/types';

export const saveGrantAction = async (formData: FormData) => {
  const user = await requireRole('teacher');
  const items = JSON.parse(String(formData.get('items') || '[]')) as GrantItemInput[];
  const grantId = String(formData.get('grant_id') || '') || undefined;
  const submit = String(formData.get('submit') || '') === '1';

  const result = await saveGrant(getDb(), {
    actor: user,
    benefitScope: String(formData.get('benefit_scope') || ''),
    cycleId: String(formData.get('cycle_id') || ''),
    description: String(formData.get('description') || ''),
    gradesImpacted: String(formData.get('grades_impacted') || ''),
    grantId,
    items,
    submit,
    wishlistUrl: String(formData.get('wishlist_url') || '') || null,
  });

  if ('error' in result) return result;

  revalidatePath('/grants');
  revalidatePath('/portal');
  redirect(grantPath(user.role, result.grantId));
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
    html: `<p>${user.name} confirmed delivery.</p>`,
    subject: 'Grant delivery confirmed',
    to: (treasurer.results ?? []).map((row) => row.email),
  });

  revalidatePath('/grants');
  revalidatePath('/portal');
  revalidatePath('/fulfill');
  revalidatePath('/budget');
  redirect(grantPath(user.role, String(formData.get('grant_id') || '')));
};
