import {describe, expect, it} from 'vitest';
import {lineActual, sumActuals, variance} from '~/lib/fulfillment';

describe('fulfillment', () => {
  it('counts purchased lines', () => {
    expect(
      lineActual({
        actual_quantity: 2,
        actual_unit_price: 10.5,
        id: 'a',
        item_status: 'PURCHASED',
      }),
    ).toBe(21);
  });

  it('treats unavailable as zero', () => {
    expect(
      lineActual({
        actual_quantity: 2,
        actual_unit_price: 10,
        id: 'a',
        item_status: 'UNAVAILABLE',
      }),
    ).toBe(0);
  });

  it('adds ad-hoc tax and shipping', () => {
    const total = sumActuals(
      [{actual_quantity: 1, actual_unit_price: 180, id: 'a', item_status: 'PURCHASED'}],
      [{actual_quantity: 1, actual_unit_price: 14.17, item_description: 'Tax'}],
    );
    expect(total).toBe(194.17);
  });

  it('tracks overage without blocking', () => {
    expect(variance(180, 210)).toBe(30);
    expect(variance(180, 142.17)).toBe(-37.83);
  });
});
