import Link from 'next/link';
import {HeaderLogo} from '~/components/header-logo';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.notFound};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-eagle-blue text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <HeaderLogo />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4" id="main">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Page not found</h1>
        <p className="font-body mt-2 text-center text-sm text-gray-600">
          That page does not exist, or you do not have access to it.
        </p>
        <Link className="btn btn-brand mt-6" href="/">
          Go home
        </Link>
      </main>
    </div>
  );
}
