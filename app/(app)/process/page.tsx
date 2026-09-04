import Link from 'next/link';
import {CopyButton} from '~/components/copy-button';
import {requireRole} from '~/lib/auth';
import {
  COMMITTEE_NOTE,
  COMMITTEE_SEATS,
  EMAIL_TEMPLATES,
  PRIORITY_GUIDELINES,
  PRIORITY_PREAMBLE,
  PROCESS_STEPS,
  RANKING_CRITERIA,
} from '~/lib/grant-process';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.process};

export default async function ProcessPage() {
  await requireRole('committee', 'principal');

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">Process guide</h1>
        <p className="font-body mt-1 text-gray-600">
          Step-by-step playbook for running a BHE PTA Teacher Grant cycle, with copyable email
          templates.
        </p>
      </div>

      {/* Steps */}
      <section>
        <h2 className="font-heading mb-4 text-xl font-bold text-charcoal">Cycle steps</h2>
        <ol className="space-y-4">
          {PROCESS_STEPS.map((step, index) => (
            <li
              className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              key={step.id}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-eagle-blue text-sm font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-semibold text-charcoal">{step.label}</p>
                <p className="font-body mt-1 text-sm text-gray-600">{step.description}</p>
                {step.href ? (
                  <Link
                    className="mt-2 inline-block text-sm font-medium text-eagle-blue hover:underline"
                    href={step.href}
                  >
                    {step.linkLabel} →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Committee composition */}
      <section>
        <h2 className="font-heading mb-1 text-xl font-bold text-charcoal">
          Grant Committee composition
        </h2>
        <p className="font-body mb-4 text-sm text-gray-600">{COMMITTEE_NOTE}</p>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Seat</th>
                <th className="px-4 py-2 text-left font-semibold text-charcoal">PTA Title</th>
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Alternate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COMMITTEE_SEATS.map((row, i) => (
                <tr key={row.seat}>
                  <td className="px-4 py-2 font-medium text-charcoal">{i + 1}</td>
                  <td className="px-4 py-2 text-gray-700">{row.pta_title}</td>
                  <td className="px-4 py-2 text-gray-500">{row.alternates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ranking criteria */}
      <section>
        <h2 className="font-heading mb-1 text-xl font-bold text-charcoal">
          Grant evaluation criteria
        </h2>
        <p className="font-body mb-4 text-sm text-gray-600">
          Committee members use these five questions to rank each application.
        </p>
        <ol className="space-y-2">
          {RANKING_CRITERIA.map((criterion, i) => (
            <li
              className="flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              key={criterion}
            >
              <span className="font-semibold text-eagle-blue">{i + 1}.</span>
              {criterion}
            </li>
          ))}
        </ol>
      </section>

      {/* Priority guidelines */}
      <section>
        <h2 className="font-heading mb-1 text-xl font-bold text-charcoal">
          Priority guidelines
        </h2>
        <p className="font-body mb-4 text-sm text-gray-600">{PRIORITY_PREAMBLE}</p>
        <div className="space-y-3">
          {PRIORITY_GUIDELINES.map((p) => (
            <div
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              key={p.value}
            >
              <span
                className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  p.value === 'HIGH'
                    ? 'bg-creek-green/15 text-creek-green'
                    : p.value === 'MEDIUM'
                      ? 'bg-spirit-gold/15 text-spirit-gold'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {p.label}
              </span>
              <p className="font-body text-sm text-gray-600">{p.guideline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Email templates */}
      <section>
        <h2 className="font-heading mb-1 text-xl font-bold text-charcoal">Email templates</h2>
        <p className="font-body mb-4 text-sm text-gray-600">
          Copy and customize these for each cycle. Replace <code className="rounded bg-gray-100 px-1 text-xs">[PLACEHOLDERS]</code> with
          cycle-specific details.
        </p>
        <div className="space-y-6">
          {EMAIL_TEMPLATES.map((template) => (
            <div
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              key={template.id}
            >
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
                <pre className="font-body whitespace-pre-wrap text-sm text-gray-700">
                  {template.body}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
