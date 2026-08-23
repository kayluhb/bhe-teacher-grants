'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type {ReactNode} from 'react';

export const DialogSubmitBar = ({
  error,
  pending,
  submitLabel,
}: {
  error?: string;
  pending?: boolean;
  submitLabel: string;
}) => (
  <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3">
    {error ? (
      <p className="mb-2 text-sm text-red-700" role="alert">
        {error}
      </p>
    ) : null}
    <button className="btn btn-brand w-full" disabled={pending} type="submit">
      {submitLabel}
    </button>
  </div>
);

export const FormDialog = ({
  children,
  description,
  onOpenChange,
  open,
  padded = true,
  title,
  triggerClassName = 'btn btn-brand',
  triggerLabel,
}: {
  children: ReactNode;
  description: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  padded?: boolean;
  title: string;
  triggerClassName?: string;
  triggerLabel: string;
}) => (
  <Dialog.Root onOpenChange={onOpenChange} open={open}>
    <Dialog.Trigger className={triggerClassName} type="button">
      {triggerLabel}
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content
        className="dialog-content"
        onInteractOutside={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('[data-committee-menu], [data-select-menu]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <Dialog.Title className="font-heading text-xl font-bold text-charcoal">
              {title}
            </Dialog.Title>
            <Dialog.Description className="font-body mt-1 text-sm text-gray-600">
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-warm-white hover:text-charcoal"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
              <path
                d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.75"
              />
            </svg>
          </Dialog.Close>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col ${padded ? 'px-5 pb-5' : ''}`}>
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
