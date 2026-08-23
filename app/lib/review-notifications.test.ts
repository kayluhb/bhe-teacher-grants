import {describe, expect, it} from 'vitest';
import {planReviewNotifications, reminderThreshold} from '~/lib/review-notifications';

const reviewers = [
  {email: 'treasurer@bheeagles.com', name: 'Treasurer', seat: 'treasurer' as const, userId: 't'},
  {email: 'principal@austinisd.org', name: 'Principal', seat: 'principal' as const, userId: 'p'},
  {email: 'committee@bheeagles.com', name: 'Sam', seat: 'committee' as const, userId: 'c'},
  {email: 'chair@bheeagles.com', name: 'Chris', seat: 'chairman' as const, userId: 'chair'},
  {email: 'teacher@austinisd.org', name: 'Jordan', seat: 'committee' as const, userId: 'teacher'},
];

const cycle = {
  ends_at: '2026-10-15T23:59:00Z',
  id: 'fall',
  name: 'Fall 2026-27 Teacher Grants',
  review_ends_at: '2026-10-20T23:59:00Z',
  review_opened_notified_at: null as string | null,
  review_starts_at: '2026-10-15T23:59:00Z',
  reviewers,
};

describe('reminderThreshold', () => {
  it('returns 3d inside the three-day window', () => {
    expect(reminderThreshold(new Date('2026-10-18T12:00:00Z'), cycle.review_ends_at)).toBe('3d');
  });

  it('returns 1d inside the last day', () => {
    expect(reminderThreshold(new Date('2026-10-20T12:00:00Z'), cycle.review_ends_at)).toBe('1d');
  });

  it('returns null when the deadline is farther out', () => {
    expect(reminderThreshold(new Date('2026-10-16T12:00:00Z'), cycle.review_ends_at)).toBeNull();
  });
});

describe('planReviewNotifications', () => {
  const grant = {
    chairman_notified_at: null as string | null,
    cycle_id: 'fall',
    id: 'g1',
    status: 'PENDING',
    teacher_id: 'teacher',
    title: 'Classroom library',
    voter_ids: [] as string[],
  };

  it('emails voting reviewers once when the review window opens', () => {
    const plan = planReviewNotifications({
      cycles: [cycle],
      grants: [grant],
      now: new Date('2026-10-16T00:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentReminders: [],
    });
    expect(plan.openStamps).toEqual(['fall']);
    expect(plan.emails.map((row) => row.to).sort()).toEqual([
      'committee@bheeagles.com',
      'principal@austinisd.org',
      'teacher@austinisd.org',
      'treasurer@bheeagles.com',
    ]);
    expect(plan.emails.some((row) => row.to === 'chair@bheeagles.com')).toBe(false);
  });

  it('does not send the open email twice', () => {
    const plan = planReviewNotifications({
      cycles: [{...cycle, review_opened_notified_at: '2026-10-16T00:00:00Z'}],
      grants: [grant],
      now: new Date('2026-10-16T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentReminders: [],
    });
    expect(plan.openStamps).toEqual([]);
    expect(plan.emails.filter((row) => row.subject.startsWith('Review is open'))).toEqual([]);
  });

  it('reminds only reviewers who still have unvoted grants', () => {
    const plan = planReviewNotifications({
      cycles: [{...cycle, review_opened_notified_at: '2026-10-16T00:00:00Z'}],
      grants: [{...grant, voter_ids: ['t', 'p']}],
      now: new Date('2026-10-18T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentReminders: [],
    });
    expect(plan.emails.map((row) => row.to).sort()).toEqual(['committee@bheeagles.com']);
    expect(plan.reminderStamps.map((row) => row.userId).sort()).toEqual(['c']);
  });

  it('skips a reminder threshold that was already sent', () => {
    const plan = planReviewNotifications({
      cycles: [{...cycle, review_opened_notified_at: '2026-10-16T00:00:00Z'}],
      grants: [grant],
      now: new Date('2026-10-18T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentReminders: [
        {cycleId: 'fall', threshold: '3d', userId: 't'},
        {cycleId: 'fall', threshold: '3d', userId: 'p'},
        {cycleId: 'fall', threshold: '3d', userId: 'c'},
        {cycleId: 'fall', threshold: '3d', userId: 'teacher'},
      ],
    });
    expect(plan.emails).toEqual([]);
  });

  it('emails the chairman only when the last required ballot is in', () => {
    const incomplete = planReviewNotifications({
      cycles: [{...cycle, review_opened_notified_at: '2026-10-16T00:00:00Z'}],
      grants: [{...grant, voter_ids: ['t', 'p']}],
      now: new Date('2026-10-16T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentReminders: [],
    });
    expect(incomplete.chairmanStamps).toEqual([]);

    const complete = planReviewNotifications({
      cycles: [{...cycle, review_opened_notified_at: '2026-10-16T00:00:00Z'}],
      grants: [{...grant, voter_ids: ['t', 'p', 'c']}],
      now: new Date('2026-10-16T12:00:00Z'),
      origin: 'https://grants.bheeagles.com',
      sentReminders: [],
    });
    expect(complete.chairmanStamps).toEqual(['g1']);
    expect(complete.emails.some((row) => row.to === 'chair@bheeagles.com')).toBe(true);
    expect(complete.emails.find((row) => row.to === 'chair@bheeagles.com')?.html).toContain(
      '/chair/g1',
    );
  });
});
