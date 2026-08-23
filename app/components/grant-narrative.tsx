import {BENEFIT_SCOPE_LABELS} from '~/lib/grant-application';
import type {GrantRow} from '~/lib/types';

export const GrantNarrative = ({grant}: {grant: GrantRow}) => (
  <div className="space-y-3">
    <p className="whitespace-pre-wrap text-gray-700">{grant.impact_statement}</p>
    <p className="text-gray-700">
      <span className="font-medium">{BENEFIT_SCOPE_LABELS[grant.benefit_scope]}</span>
      {grant.grade_level_subject ? ` · ${grant.grade_level_subject}` : ''}
    </p>
  </div>
);
