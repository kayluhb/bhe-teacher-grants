import {money} from '~/lib/money';

export type FulfillmentItemInput = {
  id: string;
  item_status: 'PURCHASED' | 'SUBSTITUTED' | 'UNAVAILABLE' | 'CANCELLED';
  actual_quantity?: number | null;
  actual_unit_price?: number | null;
  variance_note?: string | null;
};

export const variance = (approved: number, actual: number): number => money(actual - approved);
