export type CycleBudgetSnapshot = {
  budget_limit: number;
  committed: number;
  cycle_variance: number;
  id: string;
  name: string;
  pipeline_requested: number;
  remaining: number;
  school_year: string;
  school_year_id: string;
  semester: 'FALL' | 'SPRING';
  spent: number;
};

export const getCycleBudget = async (db: D1Database, cycleId: string) => {
  return db
    .prepare(
      `SELECT
         c.id, y.id AS school_year_id, y.label AS school_year, c.semester, c.name, c.budget_limit,
         COALESCE(SUM(CASE WHEN g.status = 'PENDING' THEN g.requested_amount ELSE 0 END), 0) AS pipeline_requested,
         COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0) AS committed,
         COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0) AS spent,
         c.budget_limit
           - COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0)
           AS remaining,
         COALESCE(SUM(
           CASE WHEN g.status IN ('PURCHASED', 'DELIVERED')
             THEN g.actual_amount - g.approved_amount ELSE 0 END
         ), 0) AS cycle_variance
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       LEFT JOIN grants g ON g.cycle_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`,
    )
    .bind(cycleId)
    .first<CycleBudgetSnapshot>();
};

export const getYearBudget = async (db: D1Database, schoolYearId: string) => {
  return db
    .prepare(
      `SELECT
         y.id AS school_year_id,
         y.label AS school_year,
         SUM(c.budget_limit) AS budget_limit,
         COALESCE(SUM(CASE WHEN g.status = 'PENDING' THEN g.requested_amount ELSE 0 END), 0) AS pipeline_requested,
         COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0) AS committed,
         COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0) AS spent,
         SUM(c.budget_limit)
           - COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0)
           AS remaining,
         COALESCE(SUM(
           CASE WHEN g.status IN ('PURCHASED', 'DELIVERED')
             THEN g.actual_amount - g.approved_amount ELSE 0 END
         ), 0) AS cycle_variance
       FROM school_years y
       JOIN grant_cycles c ON c.school_year_id = y.id
       LEFT JOIN grants g ON g.cycle_id = c.id
       WHERE y.id = ?
       GROUP BY y.id`,
    )
    .bind(schoolYearId)
    .first<Omit<CycleBudgetSnapshot, 'id' | 'name' | 'semester'>>();
};
