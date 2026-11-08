import {describe, expect, it, vi} from 'vitest';

vi.mock('cloudflare:workers', () => ({env: {DB: {}}}));

import {listReviewerApproved} from '~/lib/grants';

const funded = {
  id: 'grant-1',
  my_vote: 'HIGH',
  status: 'PURCHASED',
  teacher_id: 'reviewer-1',
  title: 'Class microscopes',
};

describe('listReviewerApproved', () => {
  it('loads funded grants for a seated reviewer after the decision, including their own', async () => {
    const statements: {args: unknown[]; sql: string}[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            statements.push({args, sql});
            return {
              all: async () => ({
                results: sql.includes('FROM grants') ? [funded] : [],
              }),
            };
          },
        };
      },
    };

    const grants = await listReviewerApproved(db as unknown as D1Database, 'reviewer-1');

    expect(statements[0]?.sql).toContain("g.status IN ('APPROVED', 'PURCHASED', 'DELIVERED')");
    expect(statements[0]?.sql).toContain("r.seat != 'chairman'");
    expect(statements[0]?.sql).not.toContain('teacher_id !=');
    expect(statements[0]?.sql).not.toContain('review_starts_at');
    expect(statements[0]?.args).toEqual(['reviewer-1', 'reviewer-1']);
    expect(grants).toEqual([{...funded, my_vote: 'HIGH', preview_images: []}]);
  });

  it('drops a rank that is not a ballot', async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              all: async () => ({
                results: sql.includes('FROM grants') ? [{...funded, my_vote: 'YES'}] : [],
              }),
            };
          },
        };
      },
    };

    const grants = await listReviewerApproved(db as unknown as D1Database, 'reviewer-1');

    expect(grants[0]?.my_vote).toBeNull();
  });
});
