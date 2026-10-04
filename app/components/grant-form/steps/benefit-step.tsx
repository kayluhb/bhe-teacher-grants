import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {RadioGroup} from '~/components/radio-group';
import {
  BENEFIT_SCOPE_DESCRIPTIONS,
  BENEFIT_SCOPE_LABELS,
  BENEFIT_SCOPES,
  type BenefitScope,
} from '~/lib/grant-application';

export const BenefitStep = ({
  benefitScope,
  onBack,
  onChange,
  onContinue,
}: {
  benefitScope: BenefitScope | '';
  onBack: () => void;
  onChange: (scope: BenefitScope) => void;
  onContinue: () => void;
}) => (
  <StepShell
    description="This helps the committee understand the reach of your request."
    title="Who will this grant benefit?"
  >
    <RadioGroup
      aria-label="Who this grant will benefit"
      className="grid gap-3 sm:grid-cols-2"
      name="benefit_scope"
      onValueChange={(scope) => onChange(scope as BenefitScope)}
      options={BENEFIT_SCOPES.map((scope) => ({
        description: BENEFIT_SCOPE_DESCRIPTIONS[scope],
        label: BENEFIT_SCOPE_LABELS[scope],
        value: scope,
      }))}
      value={benefitScope}
    />

    <StepNav continueDisabled={!benefitScope} onBack={onBack} onContinue={onContinue} />
  </StepShell>
);
