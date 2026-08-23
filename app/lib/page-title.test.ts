import {describe, expect, it} from 'vitest';
import {
  APP_TITLE,
  DOCUMENT_TITLES,
  GRANT_TITLE_SECTIONS,
  grantDocumentTitle,
} from '~/lib/page-title';

describe('document titles', () => {
  it('uses the BHE PTA product name', () => {
    expect(APP_TITLE).toBe('BHE PTA Teacher Grants');
  });

  it('gives every route a unique title', () => {
    const titles = [...Object.values(DOCUMENT_TITLES), ...Object.values(GRANT_TITLE_SECTIONS)];
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('keeps grant pages unique across sections when the grant name matches', () => {
    const name = 'Classroom library';
    const titles = Object.values(GRANT_TITLE_SECTIONS).map((section) =>
      grantDocumentTitle(section, name),
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('falls back to the section when the grant has no title', () => {
    expect(grantDocumentTitle(GRANT_TITLE_SECTIONS.review, '  ')).toBe(GRANT_TITLE_SECTIONS.review);
  });
});
