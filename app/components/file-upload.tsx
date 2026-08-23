'use client';

import {useState} from 'react';

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
      <label className="font-body text-sm font-medium text-charcoal">
        {label}
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="font-body mt-1 block w-full text-sm"
          onChange={onChange}
          required={required && !key}
          type="file"
        />
      </label>
      <input name={name} type="hidden" value={key} />
      {busy ? <p className="mt-1 text-xs text-gray-500">Uploading…</p> : null}
      {key ? <p className="mt-1 text-xs text-creek-green">Uploaded.</p> : null}
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
};
