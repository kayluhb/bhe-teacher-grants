import {describe, expect, it} from 'vitest';
import {deliverChairDigestItems, planChairDigest} from '~/lib/chair-digest';

const reviewers = [
  {email: 'treasurer@bheeagles.com', name: 'Treasurer', seat: 'treasurer' as const, userId: 't'},
  {email: 'chair@bheeagles.com', name: 'Chris', seat: 'chairman' as const, userId: 'chair'},
];

const cycle = {
  ends_at: '2026-10-15T23:59:00Z',
  id: 'fall',
  is_active: 1,
  name: 'Fall 2026-27 Teacher Grants',
  review_closed_notified_at: null as string | null,
  review_ends_at: '2026-10-20T23:59:00Z',
  reviewers,
  starts_at: '2026-09-01T00:00:00Z',
  submission_closed_notified_at: null as string | null,
};

const grant = {
  chair_digest_notified_at: null as string | null,
  cycle_id: 'fall',
  id: 'g1',
  status: 'PENDING',
  title: 'Classroom library',
};

describe('planChairDigest', () => {
  it('sends nothing when there is nothing new', () => {
    const plan = planChairDigest({
      cycles: [
        {
          ...cycle,
          submission_closed_notified_at: '2026-10-16T00:00:00Z',
          review_closed_notified_at: '2026-10-21T00:00:00Z',
        },
      ],
      grants: [{...grant, chair_digest_notified_at: '2026-10-10T00:00:00Z'}],
      now: new Date('2026-10-22T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [
        {cycleId: 'fall', threshold: '3d'},
        {cycleId: 'fall', threshold: '1d'},
      ],
    });
    expect(plan.emails).toEqual([]);
    expect(plan.grantStamps).toEqual([]);
  });

  it('bundles multiple new grants into one digest', () => {
    const plan = planChairDigest({
      cycles: [cycle],
      grants: [grant, {...grant, id: 'g2', title: 'Science kits'}],
      now: new Date('2026-10-10T12:00:00Z'),
      origin: 'https://grants.bheeagles.com/',
      sentSubmissionReminders: [],
    });
    expect(plan.emails).toHaveLength(1);
    expect(plan.emails[0]?.to).toBe('chair@bheeagles.com');
    expect(plan.emails[0]?.subject).toBe('Chair update: Fall 2026-27 Teacher Grants');
    expect(plan.emails[0]?.html).toContain('/chair/g1');
    expect(plan.emails[0]?.html).toContain('/chair/g2');
    expect(plan.emails[0]?.html).toContain('2 new grants submitted');
    expect(plan.grantStamps).toEqual(['g1', 'g2']);
  });

  it('includes approaching 3d and 1d only while submission is still open', () => {
    const approaching3d = planChairDigest({
      cycles: [cycle],
      grants: [],
      now: new Date('2026-10-13T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(approaching3d.submissionReminderStamps).toEqual([{cycleId: 'fall', threshold: '3d'}]);
    expect(approaching3d.emails[0]?.html).toContain('closes in 3 days');
    expect(approaching3d.emails[0]?.html).toContain('Teachers can still submit');

    const approaching1d = planChairDigest({
      cycles: [cycle],
      grants: [],
      now: new Date('2026-10-15T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(approaching1d.submissionReminderStamps).toEqual([{cycleId: 'fall', threshold: '1d'}]);
    expect(approaching1d.emails[0]?.html).toContain('closes tomorrow');

    const afterClose = planChairDigest({
      cycles: [{...cycle, submission_closed_notified_at: '2026-10-16T00:00:00Z'}],
      grants: [],
      now: new Date('2026-10-16T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(afterClose.submissionReminderStamps).toEqual([]);
    expect(afterClose.emails[0]?.html ?? '').not.toContain('Teachers can still submit');
  });

  it('skips approaching when the threshold was already sent', () => {
    const plan = planChairDigest({
      cycles: [cycle],
      grants: [],
      now: new Date('2026-10-13T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [{cycleId: 'fall', threshold: '3d'}],
    });
    expect(plan.emails).toEqual([]);
    expect(plan.submissionReminderStamps).toEqual([]);
  });

  it('does not send approaching when the cycle is inactive even before ends_at', () => {
    const plan = planChairDigest({
      cycles: [{...cycle, is_active: 0}],
      grants: [],
      now: new Date('2026-10-13T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(plan.submissionReminderStamps).toEqual([]);
    expect(plan.emails).toEqual([]);
  });

  it('notifies once when submission or review closes', () => {
    const plan = planChairDigest({
      cycles: [cycle],
      grants: [],
      now: new Date('2026-10-21T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(plan.submissionClosedStamps).toEqual(['fall']);
    expect(plan.reviewClosedStamps).toEqual(['fall']);
    expect(plan.emails[0]?.html).toContain('The submission window has closed');
    expect(plan.emails[0]?.html).toContain('The review window has closed');
    expect(plan.submissionReminderStamps).toEqual([]);
  });

  it('does not stamp closes before the deadline', () => {
    const plan = planChairDigest({
      cycles: [cycle],
      grants: [],
      now: new Date('2026-10-10T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(plan.submissionClosedStamps).toEqual([]);
    expect(plan.reviewClosedStamps).toEqual([]);
    expect(plan.emails).toEqual([]);
  });

  it('skips cycles with no chairman seat', () => {
    const plan = planChairDigest({
      cycles: [{...cycle, reviewers: reviewers.filter((row) => row.seat !== 'chairman')}],
      grants: [grant],
      now: new Date('2026-10-10T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(plan.emails).toEqual([]);
    expect(plan.grantStamps).toEqual([]);
  });
});

describe('deliverChairDigestItems', () => {
  it('keeps stamps only for digests whose send returned true', async () => {
    const plan = planChairDigest({
      cycles: [
        cycle,
        {
          ...cycle,
          id: 'spring',
          name: 'Spring 2026-27 Teacher Grants',
          starts_at: '2027-01-01T00:00:00Z',
          ends_at: '2027-03-15T23:59:00Z',
          review_ends_at: '2027-03-20T23:59:00Z',
        },
      ],
      grants: [grant, {...grant, id: 'g2', cycle_id: 'spring', title: 'Science kits'}],
      now: new Date('2026-10-10T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    expect(plan.items).toHaveLength(2);

    const delivered = await deliverChairDigestItems(plan.items, async (email) =>
      email.subject.includes('Fall'),
    );
    expect(delivered).toHaveLength(1);
    expect(delivered[0]?.grantStamps).toEqual(['g1']);
  });

  it('drops all stamps when send fails', async () => {
    const plan = planChairDigest({
      cycles: [cycle],
      grants: [grant],
      now: new Date('2026-10-10T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentSubmissionReminders: [],
    });
    const delivered = await deliverChairDigestItems(plan.items, async () => false);
    expect(delivered).toEqual([]);
  });
});
