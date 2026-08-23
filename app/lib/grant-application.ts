import {money} from '~/lib/money';

export const BENEFIT_SCOPES = ['CLASS', 'WHOLE_GRADE', 'MULTIPLE_GRADES', 'WHOLE_SCHOOL'] as const;

export type BenefitScope = (typeof BENEFIT_SCOPES)[number];

export const BENEFIT_SCOPE_LABELS: Record<BenefitScope, string> = {
  CLASS: 'My class',
  MULTIPLE_GRADES: 'Multiple grades',
  WHOLE_GRADE: 'Whole grade',
  WHOLE_SCHOOL: 'Whole school',
};

const TITLE_MAX = 80;

export const isBenefitScope = (value: string): value is BenefitScope =>
  (BENEFIT_SCOPES as readonly string[]).includes(value);

export const gradesImpactedRequired = (scope: BenefitScope): boolean =>
  scope === 'WHOLE_GRADE' || scope === 'MULTIPLE_GRADES';

export const titleFromDescription = (description: string): string => {
  const firstLine = description.trim().split('\n')[0]?.trim() ?? '';
  if (firstLine.length <= TITLE_MAX) return firstLine;
  return `${firstLine.slice(0, TITLE_MAX - 1).trimEnd()}…`;
};

export const validateGrantNarrative = (input: {
  benefitScope: string;
  description: string;
  gradesImpacted: string;
}):
  | {error: string}
  | {
      benefitScope: BenefitScope;
      description: string;
      gradesImpacted: string;
      title: string;
    } => {
  const description = input.description.trim();
  if (!description) return {error: 'Please share a short description of your request.'};
  if (!isBenefitScope(input.benefitScope)) {
    return {error: 'Please choose who this grant will benefit.'};
  }

  const gradesImpacted = input.gradesImpacted.trim();
  if (gradesImpactedRequired(input.benefitScope) && !gradesImpacted) {
    return {error: 'Please say which grades are impacted.'};
  }

  return {
    benefitScope: input.benefitScope,
    description,
    gradesImpacted: input.benefitScope === 'CLASS' ? '' : gradesImpacted,
    title: titleFromDescription(description),
  };
};

export type GrantFormLine = {
  item_description: string;
  quantity: number;
  unit_price: number;
};

export type GrantFormCheck = {
  done: boolean;
  id: 'benefit' | 'description' | 'grades' | 'items';
  label: string;
};

export const grantFormChecklist = (input: {
  benefitScope: string;
  description: string;
  gradesImpacted: string;
  items: GrantFormLine[];
}): GrantFormCheck[] => {
  const namedItems = input.items.some((item) => item.item_description.trim());
  const checks: GrantFormCheck[] = [
    {done: Boolean(input.description.trim()), id: 'description', label: 'Description'},
    {done: namedItems, id: 'items', label: 'At least one item'},
    {done: isBenefitScope(input.benefitScope), id: 'benefit', label: 'Who it benefits'},
  ];
  if (!isBenefitScope(input.benefitScope) || !gradesImpactedRequired(input.benefitScope)) {
    return checks;
  }
  return [
    ...checks,
    {done: Boolean(input.gradesImpacted.trim()), id: 'grades', label: 'Grades impacted'},
  ];
};

export const summarizeGrantItems = (items: GrantFormLine[]) => {
  const lines = items
    .filter((item) => item.item_description.trim())
    .map((item) => ({
      description: item.item_description.trim(),
      quantity: item.quantity,
      total: money(Number(item.quantity || 0) * Number(item.unit_price || 0)),
    }));
  return {
    count: lines.length,
    lines,
    total: money(lines.reduce((sum, line) => sum + line.total, 0)),
  };
};
