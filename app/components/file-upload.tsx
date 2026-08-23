'use client';

import {useId, useState} from 'react';

export const FileUpload = ({
  grantId,
  kind,
  label,
  name,
  required,
}: {
  grantId?: string;
  kind: 'quotes' | 'receipts' | 'delivery';
  label: string;
  name: string;
  required?: boolean;
}) => {
  const inputId = useId();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const data = new FormData();
    data.set('file', file);
    data.set('kind', kind);
    data.set('grant_id', grantId ?? 'draft');
    const res = await fetch('/api/uploads', {body: data, method: 'POST'});
    const json = (await res.json()) as {error?: string; key?: string};
    setBusy(false);
    if (!res.ok || !json.key) {
      setError(json.error ?? 'Upload failed.');
      return;
    }
    setKey(json.key);
  };

  return (
    <div>
      <label className="font-body block text-sm font-medium text-charcoal" htmlFor={inputId}>
        {label}
      </label>
      <label className="btn btn-secondary mt-1 w-fit cursor-pointer gap-2">
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          id={inputId}
          onChange={onChange}
          required={required && !key}
          type="file"
        />
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
          <path
            d="M8 10.5V3.5M8 3.5L5.5 6M8 3.5L10.5 6M3 12.5h10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
        {busy ? 'Uploading…' : key ? 'Change file' : 'Choose file'}
      </label>
      <input name={name} type="hidden" value={key} />
      {key && !busy ? (
        <p className="mt-1 text-xs text-creek-green" role="status">
          Uploaded.
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
