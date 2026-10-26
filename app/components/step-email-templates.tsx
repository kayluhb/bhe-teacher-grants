'use client';

import {useState} from 'react';
import {EmailTemplateCard} from '~/components/email-template-card';
import type {EmailTemplate} from '~/lib/grant-process';

export const StepEmailTemplates = ({
  editable = false,
  evaluationSend = null,
  templates,
  values = {},
  valuesById = {},
}: {
  editable?: boolean;
  evaluationSend?: {
    cycleId: string;
    instructionsSent: boolean;
    recipientCount: number;
  } | null;
  templates: EmailTemplate[];
  values?: Record<string, string>;
  valuesById?: Record<string, Record<string, string>>;
}) => {
  const [activeId, setActiveId] = useState(templates[0]?.id ?? '');
  const template = templates.find((item) => item.id === activeId) ?? templates[0];
  if (!template) return null;

  const filled = {...values, ...valuesById[template.id]};

  if (templates.length === 1) {
    return (
      <div className="mt-4">
        <EmailTemplateCard
          editable={editable}
          evaluationSend={template.id === 'evaluation-instructions' ? evaluationSend : null}
          key={template.id}
          template={template}
          values={filled}
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <nav
        aria-label="Email templates"
        className="mb-3 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1"
      >
        {templates.map((item) => {
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
      <EmailTemplateCard
        editable={editable}
        evaluationSend={template.id === 'evaluation-instructions' ? evaluationSend : null}
        key={template.id}
        template={template}
        values={filled}
      />
    </div>
  );
};
