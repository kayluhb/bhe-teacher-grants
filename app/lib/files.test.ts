import {describe, expect, it} from 'vitest';
import {
  grantIdFromFileKey,
  ownedDeliveryR2Key,
  ownedQuoteR2Key,
  ownedReceiptR2Key,
} from '~/lib/files';

describe('grantIdFromFileKey', () => {
  it('parses draft quote keys', () => {
    expect(grantIdFromFileKey('quotes/draft/user_teacher/item-1.pdf')).toEqual({
      draftUserId: 'user_teacher',
    });
  });

  it('parses grant quote keys', () => {
    expect(grantIdFromFileKey('quotes/abc123/item-1.pdf')).toEqual({grantId: 'abc123'});
  });

  it('parses receipt and delivery keys', () => {
    expect(grantIdFromFileKey('receipts/abc123-99.pdf')).toEqual({grantId: 'abc123'});
    expect(grantIdFromFileKey('delivery/abc123-99.webp')).toEqual({grantId: 'abc123'});
  });

  it('rejects unknown keys', () => {
    expect(grantIdFromFileKey('other/abc123.pdf')).toBeNull();
  });
});

describe('ownedQuoteR2Key', () => {
  const actorId = 'user_teacher';
  const grantId = 'grantabc';

  it('keeps draft keys for this actor', () => {
    expect(ownedQuoteR2Key(`quotes/draft/${actorId}/item-1.pdf`, {actorId, grantId})).toBe(
      `quotes/draft/${actorId}/item-1.pdf`,
    );
  });

  it('keeps grant keys for this grant', () => {
    expect(ownedQuoteR2Key(`quotes/${grantId}/item-1.pdf`, {actorId, grantId})).toBe(
      `quotes/${grantId}/item-1.pdf`,
    );
  });

  it('nulls out foreign draft and grant keys', () => {
    expect(ownedQuoteR2Key('quotes/draft/other_user/item-1.pdf', {actorId, grantId})).toBeNull();
    expect(ownedQuoteR2Key('quotes/othergrant/item-1.pdf', {actorId, grantId})).toBeNull();
    expect(ownedQuoteR2Key(`receipts/${grantId}-1.pdf`, {actorId, grantId})).toBeNull();
  });

  it('nulls empty keys', () => {
    expect(ownedQuoteR2Key(null, {actorId, grantId})).toBeNull();
    expect(ownedQuoteR2Key('  ', {actorId, grantId})).toBeNull();
  });
});

describe('ownedDeliveryR2Key', () => {
  it('keeps delivery keys for this grant', () => {
    expect(ownedDeliveryR2Key('delivery/grant1-123.webp', 'grant1')).toBe(
      'delivery/grant1-123.webp',
    );
  });

  it('nulls foreign or malformed keys', () => {
    expect(ownedDeliveryR2Key('delivery/other-123.webp', 'grant1')).toBeNull();
    expect(ownedDeliveryR2Key('delivery/grant1/extra.webp', 'grant1')).toBeNull();
    expect(ownedDeliveryR2Key('receipts/grant1-123.pdf', 'grant1')).toBeNull();
    expect(ownedDeliveryR2Key(null, 'grant1')).toBeNull();
  });
});

describe('ownedReceiptR2Key', () => {
  it('keeps receipt keys for this grant', () => {
    expect(ownedReceiptR2Key('receipts/grant1-123.pdf', 'grant1')).toBe('receipts/grant1-123.pdf');
  });

  it('nulls foreign or malformed keys', () => {
    expect(ownedReceiptR2Key('receipts/other-123.pdf', 'grant1')).toBeNull();
    expect(ownedReceiptR2Key('delivery/grant1-123.webp', 'grant1')).toBeNull();
    expect(ownedReceiptR2Key('', 'grant1')).toBeNull();
  });
});
