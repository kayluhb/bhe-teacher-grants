'use client';

import {useState} from 'react';
import {writeNewsletterAction} from '~/community/actions';
import {CopyButton} from '~/components/copy-button';
import {newsletterText, type SummaryGrant} from '~/lib/community';

export const GrantSummary = ({
  cycleId,
  cycleName,
  grants,
}: {
  cycleId: string;
  cycleName: string;
  grants: SummaryGrant[];
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paragraphs =
    draft
      ?.split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean) ?? [];
  const text = newsletterText(cycleName, paragraphs);

  const write = async () => {
    setBusy(true);
    setError('');
    const result = await writeNewsletterAction(cycleId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(result.paragraphs.join('\n\n'));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn btn-brand"
          disabled={busy || grants.length === 0}
          onClick={write}
          type="button"
        >
          {busy ? 'Writing…' : 'Write the newsletter'}
        </button>
        {paragraphs.length > 0 ? <CopyButton label="Copy summary" text={text} /> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {grants.length === 0 ? (
        <p className="text-sm text-gray-600">No grants have been approved yet.</p>
      ) : draft ? (
        <textarea
          aria-label="Newsletter paragraphs"
          className="field-sizing-content font-body w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-charcoal outline-none"
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          value={draft}
        />
      ) : null}
    </div>
  );
};
