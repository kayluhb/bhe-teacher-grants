'use client';

import {useActionState, useEffect, useState} from 'react';
import {type LoginState, sendCodeAction, verifyCodeAction} from '~/login/actions';

const INITIAL: LoginState = {step: 'email'};

export const LoginForm = () => {
  const [emailState, sendCode, sending] = useActionState(sendCodeAction, INITIAL);
  const [codeState, verifyCode, verifying] = useActionState(verifyCodeAction, INITIAL);
  const email = codeState.email || emailState.email || '';
  const step = codeState.step === 'code' || emailState.step === 'code' ? 'code' : 'email';
  const error = codeState.error || emailState.error;
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const next = emailState.cooldownSeconds ?? 0;
    setCooldown(next);
  }, [emailState.cooldownSeconds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-center text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {step === 'code' ? (
        <form action={verifyCode} className="space-y-3">
          <input name="email" type="hidden" value={email} />
          <p className="text-center text-sm text-gray-600">
            We sent a 6-digit code to <span className="font-medium">{email}</span>.
          </p>
          <label className="block text-sm">
            Code
            <input
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 tracking-[0.4em]"
              inputMode="numeric"
              maxLength={6}
              name="code"
              pattern="\d{6}"
              required
            />
          </label>
          <button className="btn btn-brand w-full" disabled={verifying} type="submit">
            {verifying ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      ) : null}

      <form action={sendCode} className="space-y-3">
        {step === 'code' ? <input name="email" type="hidden" value={email} /> : null}
        {step === 'email' ? (
          <label className="block text-sm">
            Work email
            <input
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              name="email"
              placeholder="you@austinisd.org"
              required
              type="email"
            />
          </label>
        ) : null}
        <button
          className={step === 'code' ? 'btn btn-secondary w-full' : 'btn btn-brand w-full'}
          disabled={sending || cooldown > 0}
          type="submit"
        >
          {sending
            ? 'Sending…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : step === 'code'
                ? 'Resend code'
                : 'Email me a code'}
        </button>
      </form>
    </div>
  );
};
