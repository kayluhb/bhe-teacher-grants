import './app.css';

export const metadata = {
  description: 'Barton Hills Elementary PTA teacher grant requests, voting, and fulfillment.',
  title: 'Teacher Grants | Barton Hills Elementary PTA',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html className="h-full" lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body h-full bg-warm-white text-charcoal antialiased">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-spirit-gold focus:px-4 focus:py-2 focus:font-bold focus:text-night-blue"
          href="#main"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
