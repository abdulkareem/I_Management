PRAGMA foreign_keys = ON;

ALTER TABLE internships ADD COLUMN internship_category TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE internships ADD COLUMN vacancy INTEGER NOT NULL DEFAULT 0;
