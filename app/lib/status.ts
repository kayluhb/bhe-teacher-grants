export const GRANT_STATUSES = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PURCHASED',
  'DELIVERED',
] as const;

export type GrantStatus = (typeof GRANT_STATUSES)[number];

export const STATUS_PILL: Record<GrantStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  PENDING: 'bg-spirit-gold/15 text-spirit-gold border-spirit-gold/30',
  APPROVED: 'bg-creek-green/15 text-creek-green border-creek-green/30',
  REJECTED: 'bg-red-100 text-red-700 border-red-300',
  PURCHASED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  DELIVERED: 'bg-slate-100 text-slate-700 border-slate-300',
};

export const STATUS_LABEL: Record<GrantStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Voting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PURCHASED: 'Purchased',
  DELIVERED: 'Delivered',
};
