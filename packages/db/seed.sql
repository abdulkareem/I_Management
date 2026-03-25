PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO admins (id, email, role, is_active)
VALUES (
  'admin_super_psmo',
  'abdulkareem@psmocollege.ac.in',
  'superadmin',
  1
);

INSERT OR IGNORE INTO auth_identities (id, role, entity_id, email, is_active)
VALUES (
  'auth_super_psmo',
  'superadmin',
  'admin_super_psmo',
  'abdulkareem@psmocollege.ac.in',
  1
);

INSERT OR IGNORE INTO industry_types (id, name, is_active) VALUES
  ('it_software', 'IT & Software', 1),
  ('mfg', 'Manufacturing', 1),
  ('healthcare', 'Healthcare', 1),
  ('fintech', 'FinTech', 1),
  ('education', 'Education', 1),
  ('media', 'Media & Communication', 1),
  ('construction', 'Construction & Infrastructure', 1),
  ('retail', 'Retail & E-Commerce', 1),
  ('automotive', 'Automotive', 1),
  ('energy', 'Energy & Utilities', 1);
