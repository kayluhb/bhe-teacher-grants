import {redirect} from 'next/navigation';
import {HeaderLogo} from '~/components/header-logo';
import {getSession, homePath} from '~/lib/auth';
import {APP_TITLE, DOCUMENT_TITLES} from '~/lib/page-title';
import {LoginForm} from '~/login/login-form';

export const metadata = {title: DOCUMENT_TITLES.login};

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(homePath(user.role));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-eagle-blue shadow-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <HeaderLogo />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4" id="main">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-2xl font-bold text-charcoal">{APP_TITLE}</h1>
            <p className="font-body mt-2 text-sm text-gray-500">Sign in to continue</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="font-body mb-6 text-center text-sm text-gray-600">
              Teachers sign in with <span className="font-medium">@austinisd.org</span>. Other
              emails work too. We’ll email a one-time code.
            </p>
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
