'use client';

import {useRouter} from 'next/navigation';
import {addCommitteeMemberAction, removeCommitteeMemberAction} from '~/chair/actions';
import {CommitteePicker} from '~/components/committee-picker';
import type {DirectoryPerson} from '~/lib/people';

export const ChairCommittee = ({
  cycleId,
  cycleLabel,
  officerIds,
  people,
  selected,
}: {
  cycleId: string;
  cycleLabel: string;
  officerIds: string[];
  people: DirectoryPerson[];
  selected: DirectoryPerson[];
}) => {
  const router = useRouter();

  return (
    <section
      className="rounded-2xl border border-eagle-blue/15 bg-white p-5 shadow-sm"
      data-tour="committee"
    >
      <div className="mb-4">
        <p className="font-heading text-xs font-semibold tracking-[0.18em] text-spirit-gold uppercase">
          Roll call
        </p>
        <h2 className="font-heading text-xl font-bold text-charcoal">Committee · {cycleLabel}</h2>
        <p className="font-body mt-1 text-sm text-gray-600">
          Five members: Principal, BHE PTA Faculty Rep, Finance Chair (Treasurer), and two
          additional board members/committee chairs. Alternates may serve in case of absence or
          conflict of interest.
        </p>
        <p className="font-body mt-1 text-sm text-gray-600">
          Add the committee members below (officers are assigned in Admin).
        </p>
      </div>
      <CommitteePicker
        excludeIds={officerIds}
        onAdd={async ({email, name}) => {
          const result = await addCommitteeMemberAction(cycleId, email, name);
          if ('error' in result) return result;
          router.refresh();
          return result;
        }}
        onRemove={async (userId) => {
          const result = await removeCommitteeMemberAction(cycleId, userId);
          if ('error' in result) return result;
          router.refresh();
          return result;
        }}
        people={people}
        selected={selected}
      />
    </section>
  );
};
