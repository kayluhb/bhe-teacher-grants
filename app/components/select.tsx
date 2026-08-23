'use client';

import * as SelectPrimitive from '@radix-ui/react-select';

export type SelectOption = {
  label: string;
  value: string;
};

const ChevronIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4 shrink-0 text-gray-500"
    fill="none"
    viewBox="0 0 16 16"
  >
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
    <path
      d="M3.5 8.5l3 3 6-6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

export const Select = ({
  'aria-label': ariaLabel,
  className = '',
  defaultValue,
  disabled,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  required,
  size = 'md',
  value,
}: {
  'aria-label'?: string;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  size?: 'md' | 'sm';
  value?: string;
}) => (
  <SelectPrimitive.Root
    disabled={disabled}
    name={name}
    onValueChange={onValueChange}
    required={required}
    {...(value ? {value} : {defaultValue: defaultValue || undefined})}
  >
    <SelectPrimitive.Trigger
      aria-label={ariaLabel}
      className={`select-trigger ${size === 'sm' ? 'select-trigger-sm' : ''} ${className}`.trim()}
      id={id ?? name}
      type="button"
    >
      <span className="min-w-0 flex-1 truncate">
        <SelectPrimitive.Value placeholder={placeholder} />
      </span>
      <SelectPrimitive.Icon>
        <ChevronIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className="select-content"
        data-select-menu=""
        position="popper"
        sideOffset={4}
      >
        <SelectPrimitive.Viewport className="select-viewport">
          {options.map((option) => (
            <SelectPrimitive.Item className="select-item" key={option.value} value={option.value}>
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className="select-item-indicator">
                <CheckIcon />
              </SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);
