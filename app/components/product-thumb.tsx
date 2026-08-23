'use client';

import {useState} from 'react';

export const ProductThumb = ({
  alt,
  className = 'h-12 w-12 rounded-lg bg-warm-white object-cover',
  url,
}: {
  alt: string;
  className?: string;
  url: string | null | undefined;
}) => {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <img
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={url}
    />
  );
};

export const PreviewStack = ({urls}: {urls: string[]}) => {
  if (urls.length === 0) return null;
  return (
    <div className="flex shrink-0">
      {urls.map((url, index) => (
        <ProductThumb
          alt=""
          className={`h-9 w-9 rounded-md border-2 border-white bg-warm-white object-cover shadow-sm ${
            index === 0 ? '' : '-ml-2'
          }`}
          key={url}
          url={url}
        />
      ))}
    </div>
  );
};
