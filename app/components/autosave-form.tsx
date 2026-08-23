'use client';

import {type ReactNode, useEffect, useRef} from 'react';
import {requestSubmitIfDirty} from '~/lib/autosave';

export const AutosaveForm = ({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const save = () => {
      void action(new FormData(form));
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type === 'hidden') return;
      requestSubmitIfDirty({requestSubmit: save}, event.target);
    };

    const onChange = (event: Event) => {
      if (!(event.target instanceof HTMLSelectElement)) return;
      save();
    };

    form.addEventListener('focusout', onFocusOut);
    form.addEventListener('change', onChange);
    return () => {
      form.removeEventListener('focusout', onFocusOut);
      form.removeEventListener('change', onChange);
    };
  }, [action]);

  return (
    <form action={action} className={className} ref={formRef}>
      {children}
    </form>
  );
};
