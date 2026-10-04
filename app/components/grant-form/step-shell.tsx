import type {ReactNode} from 'react';

export const StepShell = ({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <h2 className="font-heading text-xl font-semibold text-charcoal">{title}</h2>
    {description ? <p className="font-body mt-2 text-sm text-gray-600">{description}</p> : null}
    <div className="mt-6 space-y-4">{children}</div>
  </div>
);

export const StepNav = ({
  backLabel = 'Back',
  continueDisabled,
  continueLabel = 'Continue',
  onBack,
  onContinue,
}: {
  backLabel?: string;
  continueDisabled?: boolean;
  continueLabel?: string;
  onBack?: () => void;
  onContinue?: () => void;
}) => (
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
    {onBack ? (
      <button className="btn btn-secondary" onClick={onBack} type="button">
        {backLabel}
      </button>
    ) : (
      <span />
    )}
    {onContinue ? (
      <button
        className="btn btn-primary"
        disabled={continueDisabled}
        onClick={onContinue}
        type="button"
      >
        {continueLabel}
      </button>
    ) : null}
  </div>
);
