import {describe, expect, it} from 'vitest';
import {likeContains, parseRosterQuery, rosterPath, rosterWhere} from '~/lib/roster-query';

describe('parseRosterQuery', () => {
  it('starts on the first page with no search or role', () => {
    expect(parseRosterQuery({})).toEqual({page: 1, pageSize: 10, q: '', role: 'all'});
  });

  it('keeps a positive page, a role, and a trimmed search', () => {
    expect(parseRosterQuery({page: '2', q: '  mary ', role: 'teacher'})).toMatchObject({
      page: 2,
      q: 'mary',
      role: 'teacher',
    });
  });

  it('uses the first value when a param is repeated', () => {
    expect(
      parseRosterQuery({page: ['3', '9'], q: ['ann', 'bob'], role: ['chair', 'admin']}),
    ).toMatchObject({page: 3, q: 'ann', role: 'chair'});
  });

  it('ignores junk pages and roles', () => {
    expect(parseRosterQuery({page: '0', role: 'board'})).toMatchObject({page: 1, role: 'all'});
    expect(parseRosterQuery({page: '-4', role: 'summer'})).toMatchObject({page: 1, role: 'all'});
    expect(parseRosterQuery({page: '2.5'})).toMatchObject({page: 1});
  });
});

describe('likeContains', () => {
  it('wraps a term for a contains match', () => {
    expect(likeContains('mary')).toBe('%mary%');
  });

  it('escapes LIKE wildcards', () => {
    expect(likeContains('100%_done\\')).toBe('%100\\%\\_done\\\\%');
  });

  it('returns null for a blank search', () => {
    expect(likeContains('   ')).toBeNull();
  });
});

describe('rosterWhere', () => {
  it('matches every person when nothing is filtered', () => {
    expect(rosterWhere({q: '', role: 'all'})).toEqual({binds: [], sql: ''});
  });

  it('filters by the role shown on the roster, including the principal email', () => {
    expect(rosterWhere({q: '', role: 'principal'})).toEqual({
      binds: ['kathryn.achtermann@austinisd.org', 'principal'],
      sql: `WHERE (CASE
  WHEN lower(email) = ? THEN 'principal'
  WHEN role IN ('treasurer', 'admin') THEN 'admin'
  WHEN role IN ('chairman', 'chair') THEN 'chair'
  ELSE role
END) = ?`,
    });
  });

  it('searches name and email', () => {
    expect(rosterWhere({q: 'bhe', role: 'all'})).toEqual({
      binds: ['%bhe%', '%bhe%'],
      sql: `WHERE (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')`,
    });
  });

  it('combines role and search', () => {
    const where = rosterWhere({q: 'lee', role: 'teacher'});
    expect(where.binds).toEqual(['kathryn.achtermann@austinisd.org', 'teacher', '%lee%', '%lee%']);
    expect(where.sql.startsWith('WHERE (CASE')).toBe(true);
    expect(where.sql).toContain(`AND (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')`);
  });
});

describe('rosterPath', () => {
  it('omits the default page and role', () => {
    expect(rosterPath({page: 1, q: '', role: 'all', tab: 'roster'})).toBe('/admin?tab=roster');
  });

  it('keeps search, role, and later pages', () => {
    expect(rosterPath({page: 2, q: 'mary', role: 'teacher', tab: 'roster'})).toBe(
      '/admin?tab=roster&q=mary&role=teacher&page=2',
    );
  });
});
