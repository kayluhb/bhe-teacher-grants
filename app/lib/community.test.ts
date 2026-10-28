import {describe, expect, it} from 'vitest';
import {
  canViewGrantSummary,
  communityGrantVisible,
  communityItemLines,
  pileByClassroom,
  pileByReach,
  pilesFromModel,
  sortItemsWithModel,
  summaryText,
} from '~/lib/community';

const items = [
  {
    benefitScope: 'CLASS',
    description: 'Large bean bag chair',
    grade: '2nd grade',
    id: 'bean',
    teacherName: 'Jordan Lee',
  },
  {
    benefitScope: 'WHOLE_SCHOOL',
    description: 'Microscope',
    grade: '4th grade',
    id: 'scope',
    teacherName: 'Sam Patel',
  },
];

describe('pileByClassroom', () => {
  it('groups items under the teacher and grade', () => {
    expect(pileByClassroom(items)).toEqual([
      {itemIds: ['bean'], name: 'Jordan Lee · 2nd grade'},
      {itemIds: ['scope'], name: 'Sam Patel · 4th grade'},
    ]);
  });
});

describe('pileByReach', () => {
  it('groups items by who the grant reaches', () => {
    expect(pileByReach(items)).toEqual([
      {itemIds: ['bean'], name: 'One class'},
      {itemIds: ['scope'], name: 'The whole school'},
    ]);
  });
});

describe('pilesFromModel', () => {
  it('matches an item when the model repeats its name instead of its id', () => {
    expect(
      pilesFromModel(items, {
        groups: [{item_ids: ['Large bean bag chair'], name: 'Reading corners'}],
      }),
    ).toEqual([
      {itemIds: ['bean'], name: 'Reading corners'},
      {itemIds: ['scope'], name: 'Still to place'},
    ]);
  });

  it('keeps only real items and parks anything the model skipped', () => {
    expect(
      pilesFromModel(items, {
        groups: [
          {itemIds: ['bean', 'made-up'], name: ' Reading corners '},
          {itemIds: ['bean'], name: 'Duplicate'},
        ],
      }),
    ).toEqual([
      {itemIds: ['bean'], name: 'Reading corners'},
      {itemIds: ['scope'], name: 'Still to place'},
    ]);
  });
});

describe('summaryText', () => {
  it('writes a copyable shopping list', () => {
    expect(summaryText('Fall 2026-27 Teacher Grants', pileByClassroom(items), items)).toBe(
      [
        'Fall 2026-27 Teacher Grants',
        '',
        'Jordan Lee · 2nd grade',
        '- Large bean bag chair — Jordan Lee, 2nd grade',
        '',
        'Sam Patel · 4th grade',
        '- Microscope — Sam Patel, 4th grade',
      ].join('\n'),
    );
  });

  it('says when there are no items', () => {
    expect(summaryText('Fall 2026-27 Teacher Grants', [], [])).toBe(
      'Fall 2026-27 Teacher Grants\n\nNo items have been approved yet.',
    );
  });
});

describe('communityGrantVisible', () => {
  it('includes grants that were approved, including ones already purchased', () => {
    expect(communityGrantVisible('APPROVED')).toBe(true);
    expect(communityGrantVisible('PURCHASED')).toBe(true);
    expect(communityGrantVisible('DELIVERED')).toBe(true);
  });

  it('leaves denied, voting, and draft grants out', () => {
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

describe('sortItemsWithModel', () => {
  it('sends item ids to the model and ignores anything it invents', async () => {
    const ai = {
      run: async () => ({
        response: JSON.stringify({
          groups: [{itemIds: ['bean', 'invented'], name: 'Reading corners'}],
        }),
      }),
    };
    const result = await sortItemsWithModel(ai, items);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.piles).toEqual([
      {itemIds: ['bean'], name: 'Reading corners'},
      {itemIds: ['scope'], name: 'Still to place'},
    ]);
  });

  it('keeps complete groups when the reply is cut off', async () => {
    const ai = {
      run: async () => ({
        response:
          '{"groups":[{"name":"Reading corners","itemIds":["bean"]},{"name":"Science","itemIds":["sc',
      }),
    };
    const result = await sortItemsWithModel(ai, items);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.piles).toEqual([
      {itemIds: ['bean'], name: 'Reading corners'},
      {itemIds: ['scope'], name: 'Still to place'},
    ]);
  });

  it('reads a Workers AI reply that is already grouped JSON', async () => {
    const ai = {
      run: async () => ({
        response: {groups: [{itemIds: ['bean'], name: 'Reading corners'}]},
      }),
    };
    const result = await sortItemsWithModel(ai, items);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.piles[0]).toEqual({itemIds: ['bean'], name: 'Reading corners'});
  });

  it('reports when Workers AI is not configured', async () => {
    const result = await sortItemsWithModel(undefined, items);
    expect(result).toEqual({error: 'Workers AI is not configured.', ok: false});
  });
});

describe('canViewGrantSummary', () => {
  it('lets the chair and an admin read the summary', () => {
    expect(canViewGrantSummary({role: 'admin'}, false)).toBe(true);
    expect(canViewGrantSummary({role: 'chair'}, false)).toBe(true);
    expect(canViewGrantSummary({role: 'committee'}, true)).toBe(true);
    expect(canViewGrantSummary({role: 'principal'}, false)).toBe(false);
    expect(canViewGrantSummary({role: 'teacher'}, false)).toBe(false);
  });
});
