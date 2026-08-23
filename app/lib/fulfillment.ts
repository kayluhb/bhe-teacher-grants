import {money} from '~/lib/money';

export type FulfillmentItemInput = {
  id: string;
  item_status: 'PURCHASED' | 'SUBSTITUTED' | 'UNAVAILABLE' | 'CANCELLED';
  actual_quantity?: number | null;
  actual_unit_price?: number | null;
  actual_description?: string | null;
  variance_note?: string | null;
};

export type AdHocItemInput = {
  item_description: string;
  actual_quantity: number;
  actual_unit_price: number;
  variance_note?: string;
};

export const lineActual = (item: FulfillmentItemInput): number => {
  if (item.item_status === 'UNAVAILABLE' || item.item_status === 'CANCELLED') return 0;
  return money((item.actual_quantity ?? 0) * (item.actual_unit_price ?? 0));
};

export const sumActuals = (items: FulfillmentItemInput[], adHoc: AdHocItemInput[] = []): number => {
  const lines = items.reduce((sum, item) => sum + lineActual(item), 0);
  const extras = adHoc.reduce(
    (sum, item) => sum + money(item.actual_quantity * item.actual_unit_price),
    0,
  );
  return money(lines + extras);
};

export const variance = (approved: number, actual: number): number => money(actual - approved);
