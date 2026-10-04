import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {inputClass} from '~/components/grant-form/types';

export const WelcomeStep = ({
  applicant,
  cycleName,
  onContinue,
}: {
  applicant: {email: string; name: string};
  cycleName?: string;
  onContinue: () => void;
}) => (
  <StepShell
    description={
      cycleName
        ? `You’re applying for ${cycleName}. We’ll walk through each question one at a time.`
        : 'We’ll walk through each question one at a time.'
    }
    title="Let’s get your grant request started"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <label className="font-body text-sm font-medium text-charcoal">
        Email address
        <input
          className={`${inputClass} bg-warm-white text-gray-700`}
          readOnly
          value={applicant.email}
        />
      </label>
      <label className="font-body text-sm font-medium text-charcoal">
        Name of applicant/s
        <input
          className={`${inputClass} bg-warm-white text-gray-700`}
          readOnly
          value={applicant.name}
        />
      </label>
    </div>

    <ul className="font-body list-inside list-disc space-y-1 text-sm text-gray-600">
      <li>A short description of what you need</li>
      <li>Who the items will benefit</li>
      <li>An Amazon wishlist or product links for each item</li>
    </ul>

    <StepNav continueLabel="Get started" onContinue={onContinue} />
  </StepShell>
);
