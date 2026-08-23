'use server';

import {redirect} from 'next/navigation';
import {getSession} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {requestOtp, verifyOtp} from '~/lib/login-otp';
import {homePathForPortals, listPortals} from '~/lib/portals';

export type LoginState = {
  cooldownSeconds?: number;
  email?: string;
  error?: string;
  step: 'email' | 'code';
};

export const sendCodeAction = async (
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> => {
  const email = String(formData.get('email') || '');
  const result = await requestOtp(email);
  if ('error' in result) {
    return {
      cooldownSeconds: result.cooldownSeconds,
      email,
      error: result.error,
      step: result.cooldownSeconds ? 'code' : 'email',
    };
  }
  return {cooldownSeconds: result.cooldownSeconds, email, step: 'code'};
};

export const verifyCodeAction = async (
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> => {
  const email = String(formData.get('email') || '');
  const result = await verifyOtp(email, String(formData.get('code') || ''));
  if ('error' in result) {
    return {email, error: result.error, step: 'code'};
  }
  const user = await getSession();
  if (!user) redirect('/login');
  const portals = await listPortals(getDb(), user);
  redirect(homePathForPortals(user, portals));
};
