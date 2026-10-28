import {describe, expect, it} from 'vitest';
import {variance} from '~/lib/fulfillment';

describe('fulfillment', () => {
  it('tracks overage without blocking', () => {
    expect(variance(180, 210)).toBe(30);
    expect(variance(180, 142.17)).toBe(-37.83);
  });
});
