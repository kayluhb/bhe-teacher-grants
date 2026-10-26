'use client';

import {useRouter} from 'next/navigation';
import {useRef} from 'react';
import {Select} from '~/components/select';
import {ROLE_LABELS, ROLES} from '~/lib/roles';
import {type RosterRoleFilter, rosterPath} from '~/lib/roster-query';

const fieldClass =
  'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal shadow-sm outline-none focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

export const RosterFilters = ({q, role}: {q: string; role: RosterRoleFilter}) => {
  const router = useRouter();
  const qRef = useRef<HTMLInputElement>(null);

  const go = (next: {q?: string; role?: string}) => {
    router.push(
      rosterPath({
        page: 1,
        q: next.q ?? qRef.current?.value ?? q,
        role: next.role ?? role,
        tab: 'roster',
      }),
    );
  };

  const filtered = q !== '' || role !== 'all';

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      key={`${q}\0${role}`}
      onSubmit={(event) => {
        event.preventDefault();
        go({q: qRef.current?.value ?? ''});
      }}
    >
      <label className="min-w-56 flex-1 text-sm text-charcoal" htmlFor="roster-search">
        Search
        <input
          className={fieldClass}
          defaultValue={q}
          id="roster-search"
          name="q"
          placeholder="Name or email"
          ref={qRef}
          type="search"
        />
      </label>
      <label className="text-sm text-charcoal" htmlFor="roster-role">
        Role
        <Select
          className="mt-1 min-w-40"
          id="roster-role"
          onValueChange={(next) => go({role: next})}
          options={[
            {label: 'All roles', value: 'all'},
            ...ROLES.map((item) => ({label: ROLE_LABELS[item], value: item})),
          ]}
          value={role}
        />
      </label>
      <button className="btn btn-secondary" type="submit">
        Search
      </button>
      {filtered ? (
        <button
          className="btn btn-secondary"
          onClick={() => go({q: '', role: 'all'})}
          type="button"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
};
