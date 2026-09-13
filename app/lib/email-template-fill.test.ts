import {describe, expect, it} from 'vitest';
import {cycleEmailPlaceholders, fillTemplate} from '~/lib/email-template-fill';

describe('fillTemplate', () => {
  it('replaces every occurrence of each token', () => {
    expect(
      fillTemplate('Hello [SEMESTER] [YEAR] — [SEMESTER] again', {
        '[SEMESTER]': 'Fall',
        '[YEAR]': '2026-2027',
      }),
    ).toBe('Hello Fall 2026-2027 — Fall again');
  });
});

describe('cycleEmailPlaceholders', () => {
  it('maps cycle semester and school year to display tokens', () => {
    expect(
      cycleEmailPlaceholders({school_year: '2026-27', semester: 'SPRING'}),
    ).toEqual({
      '[SEMESTER]': 'Spring',
      '[YEAR]': '2026-2027',
    });
  });
});
