PRAGMA foreign_keys = ON;

ALTER TABLE industries ADD COLUMN company_address TEXT;
ALTER TABLE industries ADD COLUMN contact_number TEXT;
ALTER TABLE industries ADD COLUMN registration_number TEXT;
ALTER TABLE industries ADD COLUMN registration_year INTEGER;

ALTER TABLE internship_applications ADD COLUMN industry_feedback TEXT;
ALTER TABLE internship_applications ADD COLUMN industry_score REAL;
