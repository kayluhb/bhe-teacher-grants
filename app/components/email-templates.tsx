'use client';

import {useState} from 'react';
import {CopyButton} from '~/components/copy-button';
import {EMAIL_TEMPLATES} from '~/lib/grant-process';

export const EmailTemplates = () => {
  const [activeId, setActiveId] = useState(EMAIL_TEMPLATES[0]?.id ?? '');
  const template = EMAIL_TEMPLATES.find((item) => item.id === activeId) ?? EMAIL_TEMPLATES[0];
  if (!template) return null;

  return (
    <section data-tour="email-templates">
      <h3 className="font-heading mb-1 text-xl font-bold text-charcoal">Email templates</h3>
      <p className="font-body mb-4 text-sm text-gray-600">
        Copy and customize these for each cycle. Replace{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">[PLACEHOLDERS]</code> with cycle-specific
        details.
      </p>
      <nav
        aria-label="Email templates"
        className="mb-4 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1"
      >
        {EMAIL_TEMPLATES.map((item) => {
          const active = item.id === template.id;
          return (
            <button
              aria-current={active ? 'true' : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-eagle-blue text-white' : 'text-charcoal hover:bg-warm-white'
              }`}
              key={item.id}
              onClick={() => setActiveId(item.id)}
              type="button"
            >
              {item.tab}
            </button>
          );
        })}
      </nav>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div>
            <p className="font-heading font-semibold text-charcoal">{template.label}</p>
            <p className="font-body mt-0.5 text-xs text-gray-500">{template.when}</p>
          </div>
          <CopyButton text={`Subject: ${template.subject}\n\n${template.body}`} />
        </div>
        <div className="px-4 py-3">
          <p className="font-body mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Subject
          </p>
          <p className="font-body text-sm text-charcoal">{template.subject}</p>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="font-body mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Body
          </p>
          <pre className="font-body whitespace-pre-wrap text-sm text-gray-700">{template.body}</pre>
        </div>
      </div>
    </section>
  );
};
