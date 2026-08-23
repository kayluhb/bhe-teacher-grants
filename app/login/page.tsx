import {redirect} from 'next/navigation';
import {getSession, homePath} from '~/lib/auth';
import {LoginForm} from '~/login/login-form';

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(homePath(user.role));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4" id="main">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-eagle-blue to-night-blue">
            <svg
              aria-hidden="true"
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">Teacher Grants</h1>
          <p className="font-body mt-2 text-sm text-gray-500">Barton Hills Elementary PTA</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="font-body mb-6 text-center text-sm text-gray-600">
            Sign in with your <span className="font-medium">@austinisd.org</span> or{' '}
            <span className="font-medium">@bheeagles.com</span> email. We’ll email a one-time code.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
