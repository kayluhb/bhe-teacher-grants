'use client';

import {useRouter} from 'next/navigation';
import {addCommitteeMemberAction, removeCommitteeMemberAction} from '~/chair/actions';
import {CommitteeCompositionDialog} from '~/components/committee-composition-dialog';
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
        <div className="flex items-center gap-2">
          <p className="font-heading text-xs font-semibold tracking-[0.18em] text-spirit-gold uppercase">
            Roll call
          </p>
          <span id="committee-composition">
            <CommitteeCompositionDialog />
          </span>
        </div>
        <h2 className="font-heading text-xl font-bold text-charcoal">Committee · {cycleLabel}</h2>
        <p className="font-body mt-1 text-sm text-gray-600">
          Principal and Treasurer are already assigned in Admin. Add the remaining three seats
          here: one Faculty Rep and two board members or committee chairs. Alternates may serve
          for absence or conflict of interest.
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
