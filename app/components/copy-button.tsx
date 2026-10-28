'use client';

import {useState} from 'react';

export const CopyButton = ({
  className = 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100',
  label = 'Copy',
  text,
}: {
  className?: string;
  label?: string;
  text: string;
}) => {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select all in a textarea
    }
  };

  return (
    <button className={className} onClick={onClick} type="button">
      {copied ? 'Copied!' : label}
    </button>
  );
};
