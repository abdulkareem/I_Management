ALTER TABLE internships ADD COLUMN source_type TEXT NOT NULL DEFAULT 'INDUSTRY';
UPDATE internships
SET source_type = CASE
  WHEN COALESCE(created_by, 'INDUSTRY') = 'INDUSTRY' THEN 'INDUSTRY'
  WHEN COALESCE(is_external, 0) = 1 THEN 'COLLEGE'
  ELSE 'DEPARTMENT_SUGGESTED'
END
WHERE source_type IS NULL OR trim(source_type) = '';
