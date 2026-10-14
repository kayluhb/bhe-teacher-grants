export const FormProgress = ({
  completed,
  currentStep,
  steps,
}: {
  /** When set, checkmarks follow these flags instead of “steps before current”. */
  completed?: readonly boolean[];
  currentStep: number;
  steps: readonly string[];
}) => {
  const isDone = (index: number) => (completed ? Boolean(completed[index]) : index < currentStep);
  const showCheck = (index: number) => index !== currentStep && isDone(index);

  return (
    <nav aria-label="Progress" className="mb-8 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center sm:min-w-0">
        {steps.map((step, index) => (
          <li
            aria-current={index === currentStep ? 'step' : undefined}
            className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            key={step}
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  showCheck(index)
                    ? 'border-eagle-blue bg-eagle-blue text-white'
                    : index === currentStep
                      ? 'border-eagle-blue text-eagle-blue'
                      : 'border-charcoal/20 text-charcoal/70'
                }`}
              >
                {showCheck(index) ? (
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      clipRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      fillRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span aria-hidden="true" className="font-heading text-sm font-medium">
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className={`font-body mt-2 text-xs font-medium whitespace-nowrap ${
                  index === currentStep || isDone(index) ? 'text-eagle-blue' : 'text-charcoal/70'
                }`}
              >
                <span className="sr-only">
                  {showCheck(index)
                    ? 'Completed: '
                    : index === currentStep
                      ? 'Current: '
                      : 'Upcoming: '}
                </span>
                {step}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                aria-hidden="true"
                className={`mx-2 hidden h-0.5 flex-1 sm:block ${
                  isDone(index) ? 'bg-eagle-blue' : 'bg-charcoal/20'
                }`}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
};
