import {CopyButton} from '~/components/copy-button';
import {fillTemplate} from '~/lib/email-template-fill';
import type {EmailTemplate} from '~/lib/grant-process';

export const EmailTemplateCard = ({
  template,
  values = {},
}: {
  template: EmailTemplate;
  values?: Record<string, string>;
}) => {
  const subject = fillTemplate(template.subject, values);
  const body = fillTemplate(template.body, values);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div>
          <p className="font-heading font-semibold text-charcoal">{template.label}</p>
          <p className="font-body mt-0.5 text-xs text-gray-500">{template.when}</p>
        </div>
        <CopyButton text={`Subject: ${subject}\n\n${body}`} />
      </div>
      <div className="px-4 py-3">
        <p className="font-body mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          Subject
        </p>
        <p className="font-body text-sm text-charcoal">{subject}</p>
      </div>
      <div className="border-t border-gray-100 px-4 py-3">
        <p className="font-body mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          Body
        </p>
        <pre className="font-body whitespace-pre-wrap text-sm text-gray-700">{body}</pre>
      </div>
    </div>
  );
};
