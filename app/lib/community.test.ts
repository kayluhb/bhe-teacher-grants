import {describe, expect, it} from 'vitest';
import {
  canPrepareCommunityPage,
  communityDescription,
  communityGrantVisible,
  communityItemLines,
  communityPath,
  isCommunityPublished,
  storedCommunityBlurb,
} from '~/lib/community';

describe('communityDescription', () => {
  it('uses the edited wording when a blurb is saved', () => {
    expect(
      communityDescription({
        community_blurb: '  Families can use these microscopes. ',
        impact_statement: 'Original application text',
      }),
    ).toBe('Families can use these microscopes.');
  });

  it('falls back to the description the teacher submitted', () => {
    expect(
      communityDescription({
        community_blurb: '  ',
        impact_statement: 'Original application text',
      }),
    ).toBe('Original application text');
  });
});

describe('storedCommunityBlurb', () => {
  it('keeps an edit that differs from the application', () => {
    expect(storedCommunityBlurb('A shorter note for families.', 'Original application text')).toBe(
      'A shorter note for families.',
    );
  });

  it('clears the override when the text matches the application', () => {
    expect(storedCommunityBlurb('  Original application text  ', 'Original application text')).toBe(
      null,
    );
    expect(storedCommunityBlurb('   ', 'Original application text')).toBe(null);
  });
});

describe('communityGrantVisible', () => {
  it('shares grants that were approved, including ones already purchased', () => {
    expect(communityGrantVisible('APPROVED')).toBe(true);
    expect(communityGrantVisible('PURCHASED')).toBe(true);
    expect(communityGrantVisible('DELIVERED')).toBe(true);
  });

  it('leaves denied, voting, and draft grants off the page', () => {
    expect(communityGrantVisible('REJECTED')).toBe(false);
    expect(communityGrantVisible('PENDING')).toBe(false);
    expect(communityGrantVisible('DRAFT')).toBe(false);
  });
});

describe('communityItemLines', () => {
  it('lists what was funded in plain language', () => {
    expect(
      communityItemLines([
        {is_ad_hoc: 0, item_description: ' Microscope ', item_status: 'REQUESTED'},
        {is_ad_hoc: 1, item_description: 'Substitute kit', item_status: 'SUBSTITUTED'},
        {is_ad_hoc: 0, item_description: 'Cancelled kit', item_status: 'CANCELLED'},
      ]),
    ).toEqual(['Microscope']);
  });
});

describe('isCommunityPublished', () => {
  it('stays private until a publish time is set', () => {
    expect(isCommunityPublished({community_published_at: null})).toBe(false);
    expect(isCommunityPublished({community_published_at: '2026-10-28T00:00:00Z'})).toBe(true);
  });
});

describe('canPrepareCommunityPage', () => {
  it('lets the chair and an admin prepare the page', () => {
    expect(canPrepareCommunityPage({role: 'admin'}, false)).toBe(true);
    expect(canPrepareCommunityPage({role: 'chair'}, false)).toBe(true);
    expect(canPrepareCommunityPage({role: 'committee'}, true)).toBe(true);
    expect(canPrepareCommunityPage({role: 'principal'}, false)).toBe(false);
    expect(canPrepareCommunityPage({role: 'teacher'}, false)).toBe(false);
  });
});

describe('communityPath', () => {
  it('keeps a stable public link for a window', () => {
    expect(communityPath('cycle_fall_2026')).toBe('/community/cycle_fall_2026');
  });
});
