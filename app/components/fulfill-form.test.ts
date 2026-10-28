import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

vi.mock('cloudflare:workers', () => ({env: {DB: {}}}));
vi.mock('~/fulfill/actions', () => ({fulfillGrantAction: vi.fn()}));

import {FulfillForm} from '~/components/fulfill-form';
import type {GrantItemRow, GrantRow} from '~/lib/types';

const grant = {
  approved_amount: 240,
  id: 'grant-1',
  requested_amount: 240,
} as GrantRow;

const items = [
  {
    asin: 'B000BOOKS',
    id: 'item-1',
    is_ad_hoc: 0,
    item_description: 'Picture books',
    quantity: 8,
    unit_price: 12,
    vendor_url: null,
  },
] as GrantItemRow[];

describe('FulfillForm', () => {
  it('asks for one amount spent for the grant', () => {
    const html = renderToStaticMarkup(createElement(FulfillForm, {grant, items}));

    expect(html).toContain('Amount spent');
    expect(html).toContain('name="actual_amount"');
    expect(html).toContain('Picture books');
    expect(html).toContain('8 × $12.00');
    expect(html).toContain('Outcome for Picture books');
    expect(html).not.toContain('Add tax / shipping / fee');
    expect(html).not.toContain('Actual price');
    expect(html).not.toContain('Actual qty');
  });
});
