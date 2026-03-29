-- Normalize internship vacancy model to booking-style counters
-- Source of truth: total_vacancy + filled_vacancy

ALTER TABLE internships ADD COLUMN total_vacancy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN filled_vacancy INTEGER NOT NULL DEFAULT 0;

UPDATE internships
SET total_vacancy = CASE
      WHEN COALESCE(total_vacancy, 0) > 0 THEN total_vacancy
      WHEN COALESCE(vacancy, 0) > 0 THEN vacancy
      ELSE 0
    END,
    filled_vacancy = CASE WHEN COALESCE(filled_vacancy, 0) < 0 THEN 0 ELSE COALESCE(filled_vacancy, 0) END;

UPDATE internships
SET filled_vacancy = MIN(filled_vacancy, total_vacancy),
    available_vacancy = MAX(total_vacancy - filled_vacancy, 0),
    remaining_vacancy = MAX(total_vacancy - filled_vacancy, 0);
