'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

export type RadioOption = {
  label: string;
  value: string;
};

export const RadioGroup = ({
  'aria-label': ariaLabel,
  className = '',
  defaultValue,
  disabled,
  name,
  onValueChange,
  options,
  required,
  value,
}: {
  'aria-label'?: string;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  required?: boolean;
  value?: string;
}) => (
  <RadioGroupPrimitive.Root
    aria-label={ariaLabel}
    className={`radio-group ${className}`.trim()}
    disabled={disabled}
    name={name}
    onValueChange={onValueChange}
    required={required}
    {...(value ? {value} : {defaultValue: defaultValue || undefined})}
  >
    {options.map((option) => (
      <RadioGroupPrimitive.Item className="radio-item" key={option.value} value={option.value}>
        <span aria-hidden="true" className="radio-button">
          <RadioGroupPrimitive.Indicator className="radio-indicator" />
        </span>
        {option.label}
      </RadioGroupPrimitive.Item>
    ))}
  </RadioGroupPrimitive.Root>
);
