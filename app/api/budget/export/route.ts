import {requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {toListGrantFilters} from '~/lib/filters';
import {BENEFIT_SCOPE_LABELS} from '~/lib/grant-application';
import {listGrants, resolveListFilters} from '~/lib/grants';
import {formatUsd} from '~/lib/money';

export async function GET(request: Request) {
  await requireRole('committee', 'principal');
  const url = new URL(request.url);
  const filters = await resolveListFilters(getDb(), {
    semester: url.searchParams.get('semester') ?? undefined,
    year: url.searchParams.get('year') ?? undefined,
  });

  const grants = await listGrants(getDb(), toListGrantFilters(filters));

  const header = [
    'school_year',
    'semester',
    'title',
    'description',
    'teacher',
    'benefit',
    'grades',
    'status',
    'requested',
    'approved',
    'actual',
    'variance',
  ];
  const rows = grants.map((grant) => {
    const actual = grant.actual_amount;
    const approved = grant.approved_amount;
    const variance = actual != null && approved != null ? (actual - approved).toFixed(2) : '';
    return [
      grant.school_year,
      grant.semester,
      `"${grant.title.replaceAll('"', '""')}"`,
      `"${grant.impact_statement.replaceAll('"', '""')}"`,
      `"${grant.teacher_name.replaceAll('"', '""')}"`,
      `"${BENEFIT_SCOPE_LABELS[grant.benefit_scope]}"`,
      `"${grant.grade_level_subject.replaceAll('"', '""')}"`,
      grant.status,
      formatUsd(grant.requested_amount),
      approved == null ? '' : formatUsd(approved),
      actual == null ? '' : formatUsd(actual),
      variance,
    ].join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Disposition': `attachment; filename="grants-${filters.schoolYearId}-${filters.semester}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
