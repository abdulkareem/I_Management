-- Prisma-aligned migration for internship ownership and dynamic vacancy
ALTER TABLE internships ADD COLUMN created_by TEXT NOT NULL DEFAULT 'INDUSTRY';
ALTER TABLE internships ADD COLUMN visibility_type TEXT NOT NULL DEFAULT 'ALL_TARGETS';
ALTER TABLE internships ADD COLUMN available_vacancy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0;

UPDATE internships
SET available_vacancy = MAX(COALESCE(total_vacancy, vacancy, 0) - COALESCE(filled_vacancy, 0), 0)
WHERE available_vacancy IS NULL OR available_vacancy < 0;
