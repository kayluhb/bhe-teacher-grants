-- Drop bulk-seeded future school years that have no grant windows yet.
-- Keep the current default year and any year already linked to a grant cycle.
DELETE FROM school_years
WHERE is_default = 0
  AND id NOT IN (SELECT DISTINCT school_year_id FROM grant_cycles);
