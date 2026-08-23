'use client';

import type {ReactNode} from 'react';
import {GrantTable} from '~/components/grant-table';
import {useTour} from '~/components/tour-provider';
import type {GrantRow} from '~/lib/types';
import {fixturesFor, overlayTourGrants} from '~/tour/tour';

export const TourGrantTable = ({
  empty,
  grants,
  hrefBase,
  queue,
  showTeacher,
}: {
  empty?: ReactNode;
  grants: GrantRow[];
  hrefBase: string;
  queue: 'chairman' | 'fulfill' | 'reviewer' | 'teacher';
  showTeacher?: boolean;
}) => {
  const {active} = useTour();
  const overlay = overlayTourGrants({
    fixtures: fixturesFor(queue),
    real: grants,
    tourActive: active,
  });

  return (
    <div className="space-y-3" data-tour="grant-table">
      {overlay.usingFixtures ? (
        <p className="rounded-xl border border-spirit-gold/40 bg-spirit-gold/15 px-4 py-3 text-sm text-night-blue">
          Sample data for this walkthrough. It disappears when you finish.
        </p>
      ) : null}
      <GrantTable
        empty={empty}
        grants={overlay.grants}
        hrefFor={(grant) => (overlay.usingFixtures ? '#' : `${hrefBase}/${grant.id}`)}
        showTeacher={showTeacher}
      />
    </div>
  );
};
