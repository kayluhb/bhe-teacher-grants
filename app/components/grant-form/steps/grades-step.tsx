import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {inputClass} from '~/components/grant-form/types';

export const GradesStep = ({
  gradesImpacted,
  onBack,
  onChange,
  onContinue,
}: {
  gradesImpacted: string;
  onBack: () => void;
  onChange: (value: string) => void;
  onContinue: () => void;
}) => (
  <StepShell description='For example: "3rd grade" or "K–2".' title="Which grades are impacted?">
    <label className="font-body block text-sm font-medium text-charcoal">
      Grades impacted
      <input
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        required
        value={gradesImpacted}
      />
    </label>

    <StepNav continueDisabled={!gradesImpacted.trim()} onBack={onBack} onContinue={onContinue} />
  </StepShell>
);
