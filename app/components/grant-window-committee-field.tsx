'use client';

import {useState} from 'react';
import {ensureUserAction} from '~/admin/actions';
import {CommitteePicker} from '~/components/committee-picker';
import type {DirectoryPerson} from '~/lib/people';

export const GrantWindowCommitteeField = ({
  excludeIds,
  name = 'committee_user_ids',
  people,
  selected: initial,
}: {
  excludeIds: string[];
  name?: string;
  people: DirectoryPerson[];
  selected: DirectoryPerson[];
}) => {
  const [selected, setSelected] = useState(initial);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-charcoal">Committee reviewers</legend>
      <p className="text-xs text-gray-600">Teachers may be included. Search by name or email.</p>
      {selected.map((person) => (
        <input key={person.id} name={name} type="hidden" value={person.id} />
      ))}
      <CommitteePicker
        excludeIds={excludeIds}
        onAdd={async ({email, name}) => {
          const result = await ensureUserAction(email, name);
          if ('error' in result) return result;
          setSelected((current) =>
            current.some((person) => person.id === result.id) ? current : [...current, result],
          );
          return result;
        }}
        onRemove={async (userId) => {
          setSelected((current) => current.filter((person) => person.id !== userId));
          return {ok: true};
        }}
        people={people}
        selected={selected}
      />
    </fieldset>
  );
};
