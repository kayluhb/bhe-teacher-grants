'use client';

import {useTour} from '~/components/tour-provider';

export const TourHelpButton = ({tone = 'light'}: {tone?: 'dark' | 'light'}) => {
  const {page, startTour} = useTour();
  if (!page) return null;

  const className =
    tone === 'dark'
      ? 'rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-warm-white'
      : 'rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10';

  return (
    <button className={className} onClick={startTour} type="button">
      How this page works
    </button>
  );
};
