import {strToU8, unzipSync, zipSync} from 'fflate';
import {describe, expect, it} from 'vitest';
import {
  canImportWishlist,
  nextWishlistPageUrl,
  normalizeWishlistUrl,
  parseWishlistHtml,
  parseWishlistRows,
  parseWishlistXlsx,
  wishlistRetailerLabel,
} from '~/lib/wishlist';

describe('normalizeWishlistUrl', () => {
  it('accepts a public Amazon list URL', () => {
    expect(normalizeWishlistUrl('https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2?ref=wl')).toBe(
      'https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2',
    );
  });

  it('accepts Amazon list URLs with extra slashes and export params', () => {
    expect(normalizeWishlistUrl('https://www.amazon.com/hz/wishlist/ls//7I7G79U32U6')).toBe(
      'https://www.amazon.com/hz/wishlist/ls/7I7G79U32U6',
    );
    expect(
      normalizeWishlistUrl(
        'https://www.amazon.com/hz/wishlist/ls//7I7G79U32U6?_ref=ab_ure_bulk%3Aexport&bulkUploadRequestId=6a494113-94bc-4b44-b68e-16692f1983bb',
      ),
    ).toBe('https://www.amazon.com/hz/wishlist/ls/7I7G79U32U6');
  });

  it('accepts a public Walmart list URL', () => {
    expect(
      normalizeWishlistUrl(
        'https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29?ref=share',
      ),
    ).toBe('https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29');
  });

  it('accepts a public Target registry URL', () => {
    expect(
      normalizeWishlistUrl(
        'https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST',
      ),
    ).toBe('https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST');
  });

  it('rejects product pages and other vendors', () => {
    expect(normalizeWishlistUrl('https://www.walmart.com/ip/Crayola-Markers/12345')).toBeNull();
    expect(normalizeWishlistUrl('https://www.target.com/p/crayola-markers/-/A-123')).toBeNull();
    expect(normalizeWishlistUrl('https://example.com/hz/wishlist/ls/ABC')).toBeNull();
  });
});

describe('wishlistRetailerLabel', () => {
  it('names the tax-exempt retailer for stored list URLs', () => {
    expect(wishlistRetailerLabel('https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2')).toBe(
      'Amazon',
    );
    expect(
      wishlistRetailerLabel(
        'https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29',
      ),
    ).toBe('Walmart');
    expect(
      wishlistRetailerLabel(
        'https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST',
      ),
    ).toBe('Target');
  });
});

describe('canImportWishlist', () => {
  it('allows import only for Amazon lists', () => {
    expect(canImportWishlist('https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2')).toBe(true);
    expect(
      canImportWishlist(
        'https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29',
      ),
    ).toBe(false);
    expect(
      canImportWishlist(
        'https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST',
      ),
    ).toBe(false);
  });
});

describe('parseWishlistHtml', () => {
  it('reads fixture list items', () => {
    const html = `
      <div data-itemid="1" data-item-name="Dry erase markers" data-price="8.99" data-requested-qty="2" data-asin="B000MARKERS">
        <a href="https://www.amazon.com/dp/B000MARKERS">markers</a>
      </div>
      <div data-itemid="2" data-item-name="Chart paper" data-price="12.00">
        <a href="https://www.amazon.com/dp/B000CHARTS">paper</a>
      </div>
    `;
    const items = parseWishlistHtml(html);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      item_description: 'Dry erase markers',
      quantity: 2,
      source: 'WISHLIST',
      unit_price: 8.99,
    });
  });

  it('reads current Amazon markup with nested itemName links', () => {
    const html = `
      <div data-itemid="I3HHUTU1K7K8PN" data-price="13.3"
        data-reposition-action-params="{&quot;itemExternalId&quot;:&quot;ASIN:0803730551|ATVPDKIKX0DER&quot;}">
        <h4 class="a-alert-heading">An error occurred, please try again in a moment</h4>
        <h2 class="a-size-mini">
          <a id="itemName_I3HHUTU1K7K8PN" class="a-link-normal" title="The Best Story"
            href="/dp/0803730551/?coliid=I3HHUTU1K7K8PN&amp;colid=7I7G79U32U6">
            The Best Story
          </a>
        </h2>
        <span id="itemRequested_I3HHUTU1K7K8PN">1</span>
      </div>
      <div data-itemid="I2NGB6ZPWQ9QJL" data-price="36.32">
        <h2>
          <a id="itemName_I2NGB6ZPWQ9QJL" title="Alcatraz Versus the Evil Librarians"
            href="/dp/1250886694/?coliid=I2NGB6ZPWQ9QJL">
            Alcatraz Versus the Evil Librarians
          </a>
        </h2>
        <span id="itemRequested_I2NGB6ZPWQ9QJL">2</span>
      </div>
    `;
    const items = parseWishlistHtml(html);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      asin: '0803730551',
      item_description: 'The Best Story',
      quantity: 1,
      source: 'WISHLIST',
      unit_price: 13.3,
      vendor_url: 'https://www.amazon.com/dp/0803730551/?coliid=I3HHUTU1K7K8PN&colid=7I7G79U32U6',
    });
    expect(items[1]).toMatchObject({
      item_description: 'Alcatraz Versus the Evil Librarians',
      quantity: 2,
      unit_price: 36.32,
    });
  });

  it('captures a product image from the list HTML or the ASIN CDN', () => {
    const html = `
      <div data-itemid="1" data-item-name="The Best Story" data-price="13.30">
        <a id="itemName_1" href="/dp/0803730551">The Best Story</a>
        <img src="https://m.media-amazon.com/images/I/51story._SS135_.jpg" />
      </div>
      <div data-itemid="2" data-item-name="Markers" data-price="8.99" data-asin="B07GSZM4YM">
        <a href="https://www.amazon.com/dp/B07GSZM4YM">markers</a>
      </div>
    `;
    const items = parseWishlistHtml(html);
    expect(items[0]?.image_url).toBe('https://m.media-amazon.com/images/I/51story._SS135_.jpg');
    expect(items[1]?.image_url).toBe(
      'https://images-na.ssl-images-amazon.com/images/P/B07GSZM4YM.01._SCLZZZZZZZ_.jpg',
    );
  });
});

describe('nextWishlistPageUrl', () => {
  it('reads Amazon’s scroll See more URL', () => {
    const html = `
      <input type="hidden" name="showMoreUrl"
        value="/hz/wishlist/slv/items?filter=unpurchased&amp;paginationToken=ABC%3D&amp;lid=7I7G79U32U6" />
    `;
    expect(nextWishlistPageUrl(html)).toBe(
      'https://www.amazon.com/hz/wishlist/slv/items?filter=unpurchased&paginationToken=ABC%3D&lid=7I7G79U32U6',
    );
  });

  it('returns null when the list has no further page', () => {
    expect(nextWishlistPageUrl('<div data-itemid="1"></div>')).toBeNull();
  });
});

describe('parseWishlistRows', () => {
  it('reads Amazon Download list spreadsheet columns', () => {
    const items = parseWishlistRows([
      [
        'Item Identifier',
        'Title',
        'Link',
        'Price',
        'Date Added',
        'Priority',
        'Quantity to Buy',
        'Comment',
      ],
      [
        '0803730551',
        'The Best Story',
        'https://www.amazon.com/dp/0803730551',
        '$13.30',
        'August 1, 2026',
        'medium',
        '1',
        '',
      ],
      [
        'B07GSZM4YM',
        'Mr. Sketch Scented Markers',
        'https://www.amazon.com/dp/B07GSZM4YM',
        '13.99',
        '',
        '',
        '2',
        'classroom',
      ],
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      asin: '0803730551',
      item_description: 'The Best Story',
      quantity: 1,
      source: 'WISHLIST',
      unit_price: 13.3,
      vendor_url: 'https://www.amazon.com/dp/0803730551',
    });
    expect(items[1]).toMatchObject({
      asin: 'B07GSZM4YM',
      item_description: 'Mr. Sketch Scented Markers',
      quantity: 2,
      unit_price: 13.99,
    });
  });

  it('reads Amazon Business exportedList columns and skips the example row', () => {
    const items = parseWishlistRows([
      ['', 'INSTRUCTIONS'],
      [
        '',
        'ASIN or ISBN',
        'Quantity',
        'Comment',
        'Priority',
        '',
        'Availability',
        'Price',
        'Item description',
        'Status',
        'Status info',
      ],
      [
        'Unique numeric ID to identify this line',
        'ASINs (Amazon Stardard Identification Number)',
        'Provide quantity for each item',
        'Add a note about the item',
        'Choose a priority level',
        'This column validates whether each row meets input requirements',
        "The availability status for the item's offer",
        'Price of item per unit',
        'Details about the item',
        'Item upload status',
        'Details about upload status',
      ],
      [
        'Example line for illustrative purposes',
        'B0774LQ8NG',
        '999',
        'This is a good product',
        'Medium',
        '',
        'Last date that item availability and price was checked: 2026-08-23',
      ],
      ['1', '0803730551', '1.0', '', 'Medium', 'EMPTY', 'In Stock', '$14.24', 'The Best Story'],
      [
        '2',
        '1250886694',
        '1.0',
        '',
        'Medium',
        'EMPTY',
        'In Stock',
        '$36.32',
        'Alcatraz Versus the Evil Librarians TPB Boxed Set: Books 1-6',
      ],
      ['3', '059364977X', '1.0', '', 'Medium', 'EMPTY', 'In Stock', '$10.74', 'Lucky Duck'],
    ]);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      asin: '0803730551',
      item_description: 'The Best Story',
      quantity: 1,
      source: 'WISHLIST',
      unit_price: 14.24,
      vendor_url: 'https://www.amazon.com/dp/0803730551',
    });
    expect(items[2]).toMatchObject({
      asin: '059364977X',
      item_description: 'Lucky Duck',
      unit_price: 10.74,
    });
  });
});

const xmlEscape = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const buildXlsx = (
  rows: (string | number)[][],
  options: {selfClosingEmpty?: boolean} = {},
): Uint8Array => {
  const strings: string[] = [];
  const intern = (value: string): number => {
    strings.push(value);
    return strings.length - 1;
  };
  const sheetBody = rows
    .map((row, r) => {
      const cells = row.map((value, c) => {
        const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
        if (value === '' && options.selfClosingEmpty) return `<c r="${ref}" s="1"/>`;
        if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
        return `<c r="${ref}" t="s"><v>${intern(value)}</v></c>`;
      });
      return `<row r="${r + 1}">${cells.join('')}</row>`;
    })
    .join('');
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
    ),
    'xl/sharedStrings.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map((value) => `<si><t>${xmlEscape(value)}</t></si>`).join('')}
</sst>`,
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetBody}</sheetData>
</worksheet>`,
    ),
  };
  return zipSync(files);
};

describe('parseWishlistXlsx', () => {
  it('reads an Amazon Business exportedList workbook', () => {
    const bytes = buildXlsx([
      ['', 'INSTRUCTIONS'],
      [
        '',
        'ASIN or ISBN',
        'Quantity',
        'Comment',
        'Priority',
        '',
        'Availability',
        'Price',
        'Item description',
      ],
      [
        'Example line for illustrative purposes',
        'B0774LQ8NG',
        '999',
        'This is a good product',
        'Medium',
        '',
        '',
        '',
        '',
      ],
      ['1', '0803730551', '1.0', '', 'Medium', 'EMPTY', 'In Stock', '$14.24', 'The Best Story'],
    ]);
    const items = parseWishlistXlsx(bytes);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      asin: '0803730551',
      item_description: 'The Best Story',
      quantity: 1,
      unit_price: 14.24,
      vendor_url: 'https://www.amazon.com/dp/0803730551',
    });
  });

  it('reads an Amazon Business list when empty cells are self-closing', () => {
    const bytes = buildXlsx(
      [
        ['', 'INSTRUCTIONS'],
        [
          '',
          'ASIN or ISBN',
          'Quantity',
          'Comment',
          'Priority',
          '',
          'Availability',
          'Price',
          'Item description',
        ],
        [
          'Example line for illustrative purposes',
          'B0774LQ8NG',
          '999',
          'This is a good product',
          'Medium',
          '',
          '',
          '',
          '',
        ],
        ['1', '0803730551', '1.0', '', 'Medium', 'EMPTY', 'In Stock', '$14.24', 'The Best Story'],
      ],
      {selfClosingEmpty: true},
    );
    const items = parseWishlistXlsx(bytes);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      asin: '0803730551',
      item_description: 'The Best Story',
      quantity: 1,
      unit_price: 14.24,
      vendor_url: 'https://www.amazon.com/dp/0803730551',
    });
  });

  it('reads an Amazon Download list workbook', () => {
    const bytes = buildXlsx([
      ['Item Identifier', 'Title', 'Link', 'Price', 'Quantity to Buy'],
      ['0803730551', 'The Best Story', 'https://www.amazon.com/dp/0803730551', 13.3, 1],
    ]);
    const items = parseWishlistXlsx(bytes);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      asin: '0803730551',
      item_description: 'The Best Story',
      quantity: 1,
      source: 'WISHLIST',
      unit_price: 13.3,
      vendor_url: 'https://www.amazon.com/dp/0803730551',
    });
  });

  it('returns no items instead of throwing on a truncated file', () => {
    expect(parseWishlistXlsx(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toEqual([]);
  });

  it('reads SpreadsheetML with namespace prefixes', () => {
    const plain = buildXlsx([
      ['Item Identifier', 'Title', 'Link', 'Price', 'Quantity to Buy'],
      ['0803730551', 'The Best Story', 'https://www.amazon.com/dp/0803730551', 13.3, 1],
    ]);
    const files = unzipSync(plain);
    const prefixXml = (xml: string): string =>
      xml
        .replaceAll(/<\/?(?:si|t|c|v|row|sheetData|worksheet)\b/gi, (tag) =>
          tag.replace('<', '<x:').replace('</', '</x:'),
        )
        .replaceAll('<x:/', '</x:');
    const strings = files['xl/sharedStrings.xml'];
    const sheet = files['xl/worksheets/sheet1.xml'];
    if (!strings || !sheet) throw new Error('expected workbook parts');
    files['xl/sharedStrings.xml'] = strToU8(prefixXml(new TextDecoder().decode(strings)));
    files['xl/worksheets/sheet1.xml'] = strToU8(prefixXml(new TextDecoder().decode(sheet)));
    const items = parseWishlistXlsx(zipSync(files));
    expect(items).toHaveLength(1);
    expect(items[0]?.item_description).toBe('The Best Story');
  });
});
