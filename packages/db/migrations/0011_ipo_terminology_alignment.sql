-- 0011_ipo_terminology_alignment.sql
-- Non-destructive terminology alignment for IPO naming.
-- Keeps existing physical tables for backward compatibility while exposing IPO-first names.

BEGIN TRANSACTION;

CREATE VIEW IF NOT EXISTS ipos AS
SELECT
  id,
  name,
  email,
  business_activity,
  industry_type_id AS ipo_type_id,
  industry_subtype_id AS ipo_subtype_id,
  status,
  is_active,
  approved_by_admin_id,
  approved_at,
  created_at,
  updated_at,
  company_address,
  contact_number,
  registration_number,
  registration_year
FROM industries;

CREATE VIEW IF NOT EXISTS ipo_types AS
SELECT
  id,
  name,
  is_active,
  created_at,
  updated_at
FROM industry_types;

CREATE VIEW IF NOT EXISTS ipo_subtypes AS
SELECT
  id,
  name,
  industry_type_id AS ipo_type_id,
  created_at,
  updated_at
FROM industry_subtypes;

CREATE VIEW IF NOT EXISTS college_ipo_links AS
SELECT
  id,
  college_id,
  industry_id AS ipo_id,
  status,
  requested_by,
  reviewed_by_admin_id,
  reviewed_at,
  notes,
  created_at,
  updated_at
FROM college_industry_links;

COMMIT;
