import {money} from '~/lib/money';

export const CHAIR_DECIDED_STATUSES = ['APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED'] as const;

/** A revised approval tells the teacher. A revised denial does not. */
export const revisionNotifiesTeacher = (outcome: 'APPROVED' | 'REJECTED'): boolean =>
  outcome === 'APPROVED';

const APPROVED_MONEY_STATUSES = new Set<string>(['APPROVED', 'PURCHASED', 'DELIVERED']);

export type ChairDecideMoneyGrant = {
  approved_amount: number | null;
  requested_amount: number;
  status: string;
};

export type ChairDecideMoney = {
  approvedAmount: number;
  approvedCount: number;
  budgetLimit: number;
  leftAmount: number;
  pendingAmount: number;
  pendingCount: number;
};

export const chairDecideMoney = (
  grants: ChairDecideMoneyGrant[],
  budgetLimit: number,
): ChairDecideMoney => {
  let approvedAmount = 0;
  let approvedCount = 0;
  let pendingAmount = 0;
  let pendingCount = 0;

  for (const grant of grants) {
    if (APPROVED_MONEY_STATUSES.has(grant.status)) {
      approvedCount += 1;
      approvedAmount = money(approvedAmount + Number(grant.approved_amount ?? 0));
    } else if (grant.status === 'PENDING') {
      pendingCount += 1;
      pendingAmount = money(pendingAmount + Number(grant.requested_amount));
    }
  }

  const budget = money(budgetLimit);
  return {
    approvedAmount,
    approvedCount,
    budgetLimit: budget,
    leftAmount: money(budget - approvedAmount),
    pendingAmount,
    pendingCount,
  };
};
