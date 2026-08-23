'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {
  addRosterUser,
  createCycle,
  createSchoolYear,
  deleteUser,
  findOrCreateUser,
  setActiveCycle,
  updateCycle,
  updateSchoolYear,
  updateUserName,
  updateUserRole,
} from '~/lib/admin';
import {type Role, requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';

const toAdmin = (tab?: string, error?: string): never => {
  const params = new URLSearchParams();
  if (error) params.set('error', error);
  if (tab) params.set('tab', tab);
  redirect(params.size ? `/admin?${params}` : '/admin');
};

const fail = (error: string, tab?: string): never => toAdmin(tab, error);

const tabFrom = (formData: FormData) => String(formData.get('tab') || '');

export type AdminFormState = {error?: string};

export const addRosterUserAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await addRosterUser(getDb(), {
    email: String(formData.get('email') || ''),
    name: String(formData.get('name') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(tab);
};

export const updateUserRoleAction = async (formData: FormData): Promise<void> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await updateUserRole(getDb(), {
    role: String(formData.get('role') || '') as Role,
    userId: String(formData.get('user_id') || ''),
  });
  if ('error' in result) fail(result.error, tab);
  revalidatePath('/admin');
};

export const updateUserNameAction = async (formData: FormData): Promise<void> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await updateUserName(getDb(), {
    name: String(formData.get('name') || ''),
    userId: String(formData.get('user_id') || ''),
  });
  if ('error' in result) fail(result.error, tab);
  revalidatePath('/admin');
};

export const deleteUserAction = async (formData: FormData): Promise<void> => {
  const actor = await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await deleteUser(getDb(), {
    actorId: actor.id,
    userId: String(formData.get('user_id') || ''),
  });
  if ('error' in result) fail(result.error, tab);
  revalidatePath('/admin');
};

export const createSchoolYearAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await createSchoolYear(getDb(), {
    endsOn: String(formData.get('ends_on') || ''),
    isDefault: formData.get('is_default') === '1',
    label: String(formData.get('label') || ''),
    startsOn: String(formData.get('starts_on') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(tab);
};

export const updateSchoolYearAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await updateSchoolYear(getDb(), {
    endsOn: String(formData.get('ends_on') || ''),
    isDefault: formData.get('is_default') === '1',
    startsOn: String(formData.get('starts_on') || ''),
    yearId: String(formData.get('year_id') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(tab);
};

const cycleFromForm = (formData: FormData) => ({
  budgetLimit: Number(formData.get('budget_limit') || 0),
  chairmanUserId: String(formData.get('chairman_user_id') || ''),
  committeeUserIds: formData.getAll('committee_user_ids').map(String),
  endsAt: String(formData.get('ends_at') || ''),
  isActive: formData.get('is_active') === '1',
  name: String(formData.get('name') || ''),
  principalUserId: String(formData.get('principal_user_id') || ''),
  reviewEndsAt: String(formData.get('review_ends_at') || ''),
  reviewStartsAt: String(formData.get('review_starts_at') || ''),
  schoolYearId: String(formData.get('school_year_id') || ''),
  semester: String(formData.get('semester') || ''),
  startsAt: String(formData.get('starts_at') || ''),
  treasurerUserId: String(formData.get('treasurer_user_id') || ''),
});

export const createCycleAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await createCycle(getDb(), cycleFromForm(formData));
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(tab);
};

export const updateCycleAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await updateCycle(getDb(), {
    ...cycleFromForm(formData),
    cycleId: String(formData.get('cycle_id') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  revalidatePath('/grants');
  return toAdmin(tab);
};

export const setActiveCycleAction = async (formData: FormData): Promise<void> => {
  await requireRole('admin');
  const tab = tabFrom(formData);
  const result = await setActiveCycle(getDb(), String(formData.get('cycle_id') || ''));
  if ('error' in result) fail(result.error, tab);
  revalidatePath('/admin');
  revalidatePath('/grants');
};

export const ensureUserAction = async (email: string, name?: string) => {
  await requireRole('admin');
  return findOrCreateUser(getDb(), {email, name});
};
