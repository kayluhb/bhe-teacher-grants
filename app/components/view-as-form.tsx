'use client';

import {ROLE_LABELS, type User} from '~/lib/roles';
import {canManageViewAs, isViewingAs, VIEW_AS_ROLES} from '~/lib/view-as';
import {setViewAsAction} from '~/view-as/actions';

export const ViewAsForm = ({compact = false, user}: {compact?: boolean; user: User}) => {
  if (!canManageViewAs(user)) return null;

  const previewing = isViewingAs(user);

  return (
    <div className={compact ? 'space-y-2' : 'mt-3 space-y-2'}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">View as</p>
      <form action={setViewAsAction} className="flex flex-col gap-2">
        <select
          aria-label="Preview role"
          className="w-full rounded border border-white/20 bg-eagle-blue/80 px-2 py-1.5 text-xs text-white"
          defaultValue={previewing ? user.role : 'admin'}
          name="role"
        >
          <option value="admin">Admin (me)</option>
          {VIEW_AS_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button
          className="rounded bg-white/15 px-2 py-1.5 text-xs font-medium text-white hover:bg-white/25"
          type="submit"
        >
          {previewing ? 'Switch role' : 'Preview'}
        </button>
      </form>
      {previewing ? (
        <form action={setViewAsAction}>
          <input name="role" type="hidden" value="admin" />
          <button className="text-xs text-amber-200 underline hover:text-white" type="submit">
            Exit preview
          </button>
        </form>
      ) : null}
    </div>
  );
};

export const ViewAsBanner = ({user}: {user: User}) => {
  if (!isViewingAs(user)) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-eagle-blue">
      <p>
        Viewing as <span className="font-semibold">{ROLE_LABELS[user.role]}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={setViewAsAction} className="flex items-center gap-2">
          <select
            aria-label="Switch preview role"
            className="rounded border border-eagle-blue/30 bg-white px-2 py-1 text-xs"
            defaultValue={user.role}
            name="role"
          >
            {VIEW_AS_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            className="rounded bg-eagle-blue/10 px-2 py-1 text-xs font-semibold hover:bg-eagle-blue/20"
            type="submit"
          >
            Switch
          </button>
        </form>
        <form action={setViewAsAction}>
          <input name="role" type="hidden" value="admin" />
          <button
            className="rounded bg-eagle-blue px-3 py-1 text-xs font-semibold text-white hover:bg-eagle-blue/90"
            type="submit"
          >
            Exit preview
          </button>
        </form>
      </div>
    </div>
  );
};
