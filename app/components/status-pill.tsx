import {type GrantStatus, STATUS_LABEL, STATUS_PILL} from '~/lib/status';

export const StatusPill = ({status}: {status: GrantStatus}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[status]}`}
  >
    {STATUS_LABEL[status]}
  </span>
);
