'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {notifyQuietly} from '~/lib/email';
import type {AdHocItemInput, FulfillmentItemInput} from '~/lib/fulfillment';
import {fulfillGrant, getGrant} from '~/lib/grants';

export const fulfillGrantAction = async (formData: FormData) => {
  const user = await requireRole('admin');
  const items = JSON.parse(String(formData.get('items') || '[]')) as FulfillmentItemInput[];
  const adHocItems = JSON.parse(String(formData.get('ad_hoc_items') || '[]')) as AdHocItemInput[];
  const grantId = String(formData.get('grant_id') || '');

  const result = await fulfillGrant(getDb(), {
    actor: user,
    adHocItems,
    grantId,
    items,
    receiptR2Key: String(formData.get('receipt_r2_key') || '') || null,
    trackingNumber: String(formData.get('tracking_number') || '') || null,
    varianceNote: String(formData.get('variance_note') || '') || null,
    vendorName: String(formData.get('vendor_name') || ''),
  });
  if ('error' in result) return result;

  const grant = await getGrant(getDb(), grantId);
  if (grant) {
    notifyQuietly({
      html: `<p>Your grant “${grant.title}” has been purchased. Please confirm when it arrives.</p>`,
      subject: 'Grant purchased — confirm delivery',
      to: grant.teacher_email,
    });
  }

  revalidatePath('/fulfill');
  revalidatePath('/budget');
  revalidatePath('/grants');
  redirect(`/fulfill/${grantId}`);
};
