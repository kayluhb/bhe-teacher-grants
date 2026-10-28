import {describe, expect, it} from 'vitest';
import {
  CHAIR_DECIDED_STATUSES,
  chairDecideMoney,
  revisionNotifiesTeacher,
} from '~/lib/chair-decide';

describe('chairDecideMoney', () => {
  it('counts approved caps, keeps pending separate, and leaves rejected out of the leftover', () => {
    const totals = chairDecideMoney(
      [
        {approved_amount: 420, requested_amount: 420, status: 'APPROVED'},
        {approved_amount: 850, requested_amount: 900, status: 'PURCHASED'},
        {approved_amount: 100, requested_amount: 100, status: 'DELIVERED'},
        {approved_amount: null, requested_amount: 480, status: 'PENDING'},
        {approved_amount: null, requested_amount: 310, status: 'REJECTED'},
        {approved_amount: null, requested_amount: 50, status: 'DRAFT'},
      ],
      8000,
    );

    expect(totals).toEqual({
      approvedAmount: 1370,
      approvedCount: 3,
      budgetLimit: 8000,
      leftAmount: 6630,
      pendingAmount: 480,
      pendingCount: 1,
    });
  });

  it('treats a missing approved cap as zero and keeps the full budget when nothing is approved', () => {
    expect(
      chairDecideMoney([{approved_amount: null, requested_amount: 200, status: 'APPROVED'}], 1000),
    ).toMatchObject({approvedAmount: 0, approvedCount: 1, leftAmount: 1000});

    expect(chairDecideMoney([], 8000)).toMatchObject({
      approvedAmount: 0,
      approvedCount: 0,
      leftAmount: 8000,
      pendingAmount: 0,
      pendingCount: 0,
    });
  });

  it('lists approved and rejected grants as decided, and leaves drafts and pending out', () => {
    expect([...CHAIR_DECIDED_STATUSES]).toEqual(['APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED']);
  });
});

describe('revisionNotifiesTeacher', () => {
  it('emails the teacher only when a denial becomes an approval', () => {
    expect(revisionNotifiesTeacher('APPROVED')).toBe(true);
    expect(revisionNotifiesTeacher('REJECTED')).toBe(false);
  });
});
