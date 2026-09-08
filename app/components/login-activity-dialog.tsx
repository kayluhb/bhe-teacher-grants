'use client';

import {FormDialog} from '~/components/form-dialog';
import {formatSchoolCompactDateTime} from '~/lib/grant-cycle';
import {type LoginEventKind, loginEventLabel} from '~/lib/login-events';

export const LoginActivityDialog = ({
  email,
  events,
  name,
}: {
  email: string;
  events: {created_at: string; id: string; kind: LoginEventKind}[];
  name: string;
}) => (
  <FormDialog
    description={`Recent sign-in activity for ${email}.`}
    title={`Login activity · ${name}`}
    triggerClassName="whitespace-nowrap text-sm text-eagle-blue underline"
    triggerLabel="Activity"
  >
    {events.length === 0 ? (
      <p className="text-sm text-gray-600">No login activity recorded yet.</p>
    ) : (
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {events.map((event) => (
          <li
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-warm-white px-3 py-2 text-sm"
            key={event.id}
          >
            <span className="font-medium text-charcoal">{loginEventLabel(event.kind)}</span>
            <span className="shrink-0 text-gray-500">
              {formatSchoolCompactDateTime(event.created_at)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </FormDialog>
);
