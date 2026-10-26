'use server';

import {env} from 'cloudflare:workers';
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
import {cycleInputFromFormData} from '~/lib/grant-cycle';
import {deleteGrantFiles} from '~/lib/grant-files';
import {parseRosterQuery, rosterPath} from '~/lib/roster-query';

const toAdmin = (formData: FormData, error?: string): never => {
  const tab = String(formData.get('tab') || '');
  const roster = parseRosterQuery({
    page: String(formData.get('roster_page') || ''),
    q: String(formData.get('roster_q') || ''),
    role: String(formData.get('roster_role') || ''),
  });
  redirect(
    rosterPath({
      error,
      page: roster.page,
      q: roster.q,
      role: roster.role,
      tab: tab || undefined,
    }),
  );
};

const fail = (formData: FormData, error: string): never => toAdmin(formData, error);

export type AdminFormState = {error?: string};

export const addRosterUserAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const result = await addRosterUser(getDb(), {
    email: String(formData.get('email') || ''),
    name: String(formData.get('name') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(formData);
};

export const updateUserRoleAction = async (formData: FormData): Promise<void> => {
  await requireRole('admin');
  const result = await updateUserRole(getDb(), {
    role: String(formData.get('role') || '') as Role,
    userId: String(formData.get('user_id') || ''),
  });
  if ('error' in result) fail(formData, result.error);
  revalidatePath('/admin');
};

export const updateUserNameAction = async (formData: FormData): Promise<void> => {
  await requireRole('admin');
  const result = await updateUserName(getDb(), {
    name: String(formData.get('name') || ''),
    userId: String(formData.get('user_id') || ''),
  });
  if ('error' in result) fail(formData, result.error);
  revalidatePath('/admin');
};

export const deleteUserAction = async (formData: FormData): Promise<void> => {
  const actor = await requireRole('admin');
  const result = await deleteUser(getDb(), {
    actorId: actor.id,
    userId: String(formData.get('user_id') || ''),
  });
  if ('error' in result) fail(formData, result.error);
  await deleteGrantFiles(env.FILES_BUCKET, result.fileKeys);
  revalidatePath('/admin');
  revalidatePath('/grants');
  revalidatePath('/portal');
  revalidatePath('/review');
  revalidatePath('/chair');
  revalidatePath('/fulfill');
};

export const createSchoolYearAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const result = await createSchoolYear(getDb(), {
    endsOn: String(formData.get('ends_on') || ''),
    isDefault: formData.get('is_default') === '1',
    label: String(formData.get('label') || ''),
    startsOn: String(formData.get('starts_on') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(formData);
};

export const updateSchoolYearAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const result = await updateSchoolYear(getDb(), {
    endsOn: String(formData.get('ends_on') || ''),
    isDefault: formData.get('is_default') === '1',
    startsOn: String(formData.get('starts_on') || ''),
    yearId: String(formData.get('year_id') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  return toAdmin(formData);
};

export const createCycleAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const result = await createCycle(getDb(), cycleInputFromFormData(formData));
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  revalidatePath('/chair');
  revalidatePath('/chair/windows');
  return toAdmin(formData);
};

export const updateCycleAction = async (
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> => {
  await requireRole('admin');
  const result = await updateCycle(getDb(), {
    ...cycleInputFromFormData(formData),
    cycleId: String(formData.get('cycle_id') || ''),
  });
  if ('error' in result) return {error: result.error};
  revalidatePath('/admin');
  revalidatePath('/chair');
  revalidatePath('/chair/windows');
  revalidatePath('/grants');
  return toAdmin(formData);
};

export const setActiveCycleAction = async (formData: FormData): Promise<void> => {
  await requireRole('admin');
  const result = await setActiveCycle(getDb(), String(formData.get('cycle_id') || ''));
  if ('error' in result) fail(formData, result.error);
  revalidatePath('/admin');
  revalidatePath('/chair');
  revalidatePath('/chair/windows');
  revalidatePath('/grants');
};

export const ensureUserAction = async (email: string, name?: string) => {
  await requireRole('admin', 'chair');
  return findOrCreateUser(getDb(), {email, name});
};
