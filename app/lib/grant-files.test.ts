import {describe, expect, it} from 'vitest';
import {deleteGrantFiles, grantFileKeys} from '~/lib/grant-files';

describe('grantFileKeys', () => {
  it('collects receipt, proof, and quote keys and skips empties', () => {
    expect(
      grantFileKeys(
        {
          proof_of_delivery_r2_key: 'delivery/grant1-2.webp',
          receipt_r2_key: 'receipts/grant1-1.pdf',
        },
        [
          {quote_r2_key: 'quotes/grant1/item-a.pdf'},
          {quote_r2_key: null},
          {quote_r2_key: ''},
          {quote_r2_key: 'quotes/grant1/item-b.pdf'},
        ],
      ),
    ).toEqual([
      'receipts/grant1-1.pdf',
      'delivery/grant1-2.webp',
      'quotes/grant1/item-a.pdf',
      'quotes/grant1/item-b.pdf',
    ]);
  });

  it('returns an empty list when there are no files', () => {
    expect(grantFileKeys({proof_of_delivery_r2_key: null, receipt_r2_key: null}, [])).toEqual([]);
  });
});

describe('deleteGrantFiles', () => {
  it('deletes each key and ignores individual failures', async () => {
    const deleted: string[] = [];
    await deleteGrantFiles(
      {
        delete: async (key) => {
          deleted.push(key);
          if (key === 'bad') throw new Error('missing');
        },
      },
      ['a.pdf', 'bad', 'b.pdf'],
    );
    expect(deleted).toEqual(['a.pdf', 'bad', 'b.pdf']);
  });
});
