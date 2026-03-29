CREATE TABLE IF NOT EXISTS industry_subtypes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry_type_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (industry_type_id) REFERENCES industry_types(id) ON DELETE CASCADE,
  UNIQUE (industry_type_id, name)
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE industries ADD COLUMN industry_subtype_id TEXT;

CREATE INDEX IF NOT EXISTS idx_industry_subtypes_type ON industry_subtypes(industry_type_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
