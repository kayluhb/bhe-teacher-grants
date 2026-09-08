import {EmailTemplates} from '~/components/email-templates';
import {ProcessStepList} from '~/components/process-step-list';
import type {ChairProcessStepId, StepStatus} from '~/lib/chair-process-status';
import {
  CHAIR_PROCESS_STEPS,
  COMMITTEE_NOTE,
  COMMITTEE_PROCESS_STEPS,
  COMMITTEE_SEATS,
  PRIORITY_GUIDELINES,
  PRIORITY_PREAMBLE,
  PROCESS_STEPS,
  RANKING_CRITERIA,
  TEACHER_PROCESS_STEPS,
} from '~/lib/grant-process';

const RankingCriteria = () => (
  <section>
    <h3 className="font-heading mb-1 text-xl font-bold text-charcoal">Grant evaluation criteria</h3>
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
);

const PriorityGuidelines = () => (
  <section>
    <h3 className="font-heading mb-1 text-xl font-bold text-charcoal">Priority guidelines</h3>
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
);

const CommitteeComposition = () => (
  <section id="committee-composition">
    <h3 className="font-heading mb-1 text-xl font-bold text-charcoal">
      Grant Committee composition
    </h3>
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
);

export const TeacherProcessGuide = () => (
  <div className="space-y-6">
    <div>
      <h2 className="font-heading text-2xl font-bold text-charcoal">How grants work</h2>
      <p className="font-body mt-1 text-gray-600">
        Your path from idea to funded classroom project.
      </p>
    </div>
    <ProcessStepList steps={TEACHER_PROCESS_STEPS} />
  </div>
);

export const CommitteeProcessGuide = () => (
  <div className="space-y-10">
    <div>
      <h2 className="font-heading text-2xl font-bold text-charcoal">How ranking works</h2>
      <p className="font-body mt-1 text-gray-600">
        What to do when the review window is open — criteria and priority levels included.
      </p>
    </div>
    <section>
      <h3 className="font-heading mb-4 text-xl font-bold text-charcoal">Your steps</h3>
      <ProcessStepList steps={COMMITTEE_PROCESS_STEPS} />
    </section>
    <RankingCriteria />
    <PriorityGuidelines />
  </div>
);

export const ChairProcessGuide = ({
  cycleId,
  statuses,
}: {
  cycleId?: string;
  statuses?: Partial<Record<ChairProcessStepId, StepStatus>>;
} = {}) => (
  <div className="space-y-10" data-tour="chair-playbook">
    <div>
      <h2 className="font-heading text-2xl font-bold text-charcoal">Chair playbook</h2>
      <p className="font-body mt-1 text-gray-600">
        Full-cycle checklist from publishing windows through outcome stories — what you do here,
        what to coordinate with Admin (school years) or the Treasurer, and copyable email templates.
        Status reflects the active grant window; mark the email/outreach steps when you finish them.
      </p>
    </div>
    <section>
      <h3 className="font-heading mb-4 text-xl font-bold text-charcoal">Your steps</h3>
      <ProcessStepList cycleId={cycleId} statuses={statuses} steps={CHAIR_PROCESS_STEPS} />
    </section>
    <EmailTemplates />
  </div>
);

export const ProcessGuide = () => (
  <div className="space-y-10" data-tour="process-guide">
    <div>
      <h2 className="font-heading text-2xl font-bold text-charcoal">Process guide</h2>
      <p className="font-body mt-1 text-gray-600">
        Step-by-step playbook for running a BHE PTA Teacher Grant cycle, with copyable email
        templates.
      </p>
    </div>

    <section>
      <h3 className="font-heading mb-4 text-xl font-bold text-charcoal">Cycle steps</h3>
      <ProcessStepList steps={PROCESS_STEPS} />
    </section>

    <CommitteeComposition />

    <RankingCriteria />
    <PriorityGuidelines />

    <EmailTemplates />
  </div>
);
