'use client';

import {usePathname} from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  hasSeenTour,
  markTourSeen,
  stepsFor,
  type TourPage,
  tourPageFromPath,
  visibleTourSteps,
} from '~/tour/tour';

type TourContextValue = {
  active: boolean;
  page: TourPage | null;
  startTour: () => void;
};

const TourContext = createContext<TourContextValue>({
  active: false,
  page: null,
  startTour: () => {},
});

export const useTour = () => useContext(TourContext);

export const TourProvider = ({children}: {children: ReactNode}) => {
  const pathname = usePathname() ?? '/';
  const page = tourPageFromPath(pathname);
  const [active, setActive] = useState(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  const startTour = useCallback(() => {
    if (!page) return;
    setActive(false);
    window.setTimeout(() => setActive(true), 0);
  }, [page]);

  useEffect(() => {
    if (!page) {
      setActive(false);
      return;
    }
    if (typeof window === 'undefined') return;
    if (!hasSeenTour(window.localStorage, page)) setActive(true);
  }, [page]);

  useEffect(() => {
    if (!active || !page) return;
    let cancelled = false;
    let instance: {destroy: () => void} | null = null;

    const run = async () => {
      const {driver} = await import('driver.js');
      await import('driver.js/dist/driver.css');
      if (cancelled) return;
      const currentPage = pageRef.current;
      if (!currentPage) return;
      const steps = visibleTourSteps(stepsFor(currentPage), (selector) =>
        Boolean(document.querySelector(selector)),
      );
      if (steps.length === 0) {
        markTourSeen(window.localStorage, currentPage);
        setActive(false);
        return;
      }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const tour = driver({
        animate: !reduceMotion,
        disableActiveInteraction: true,
        doneBtnText: 'Got it',
        nextBtnText: 'Next',
        overlayClickBehavior: 'nextStep',
        overlayColor: '#0a2a15',
        overlayOpacity: 0.58,
        popoverClass: 'bhe-tour-popover',
        prevBtnText: 'Back',
        progressText: '{{current}} of {{total}}',
        showProgress: true,
        skipMissingElement: true,
        stagePadding: 8,
        stageRadius: 12,
        steps: steps.map((step) => ({
          disableActiveInteraction: true,
          element: step.element,
          popover: {
            description: step.popover.description,
            title: step.popover.title,
          },
          skipMissingElement: Boolean(step.optional),
        })),
        onDestroyed: () => {
          if (pageRef.current) markTourSeen(window.localStorage, pageRef.current);
          if (!cancelled) setActive(false);
        },
      });
      instance = tour;
      tour.drive();
    };

    const timer = window.setTimeout(run, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      instance?.destroy();
    };
  }, [active, page]);

  const value = useMemo(() => ({active, page, startTour}), [active, page, startTour]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};
