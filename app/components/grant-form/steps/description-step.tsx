import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {inputClass} from '~/components/grant-form/types';

export const DescriptionStep = ({
  description,
  onBack,
  onChange,
  onContinue,
}: {
  description: string;
  onBack: () => void;
  onChange: (value: string) => void;
  onContinue: () => void;
}) => (
  <StepShell
    description="The first line becomes the title of your request."
    title="What are you requesting?"
  >
    <label className="font-body block text-sm font-medium text-charcoal">
      Please share a short description of your request.
      <textarea
        className={`${inputClass} min-h-28`}
        onChange={(event) => onChange(event.target.value)}
        required
        value={description}
      />
    </label>

    <StepNav continueDisabled={!description.trim()} onBack={onBack} onContinue={onContinue} />
  </StepShell>
);
