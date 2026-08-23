'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type {ReactNode} from 'react';

export const FormDialog = ({
  children,
  description,
  onOpenChange,
  open,
  title,
  triggerClassName = 'btn btn-brand',
  triggerLabel,
}: {
  children: ReactNode;
  description: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
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
      <Dialog.Content className="dialog-content">
        <div className="mb-4 flex items-start justify-between gap-3">
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
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
