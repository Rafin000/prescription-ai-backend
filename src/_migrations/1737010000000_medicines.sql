-- Medicine library. team_id nullable: null rows are shared across all teams
-- (the BD BNF-like baseline), non-null rows are the team's custom additions
-- and notes. Promote fields we search/sort; everything else in `data`.
CREATE TABLE IF NOT EXISTS medicines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NULL REFERENCES teams(id) ON DELETE CASCADE,
  brand       text NOT NULL,
  generic     text NOT NULL,
  strength    text NULL,
  company     text NULL,
  form        text NULL CHECK (form IN ('tablet','capsule','syrup','injection','cream','drops') OR form IS NULL),
  rating      numeric(3,2) NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- { doctor_note, aliases, ... }
  data        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS medicines_brand_trgm
  ON medicines USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS medicines_generic_trgm
  ON medicines USING gin (generic gin_trgm_ops);
CREATE INDEX IF NOT EXISTS medicines_team_idx
  ON medicines (team_id) WHERE team_id IS NOT NULL;

-- Seed a small BD-common baseline so doctors get autocomplete out of the box.
-- Deliberately not exhaustive — teams will add their own on top.
INSERT INTO medicines (brand, generic, strength, company, form) VALUES
  ('Napa',        'Paracetamol',      '500mg', 'Beximco',          'tablet'),
  ('Ace',         'Paracetamol',      '500mg', 'Square',           'tablet'),
  ('Fexo',        'Fexofenadine',     '120mg', 'Square',           'tablet'),
  ('Alatrol',     'Cetirizine',       '10mg',  'ACI',              'tablet'),
  ('Monas',       'Montelukast',      '10mg',  'ACI',              'tablet'),
  ('Seclo',       'Omeprazole',       '20mg',  'Square',           'capsule'),
  ('Finix',       'Pantoprazole',     '20mg',  'Opsonin',          'tablet'),
  ('Maxpro',      'Esomeprazole',     '20mg',  'Renata',           'capsule'),
  ('Amdocal',     'Amlodipine',       '5mg',   'ACI',              'tablet'),
  ('Lozar',       'Losartan',         '50mg',  'Incepta',          'tablet'),
  ('Atova',       'Atorvastatin',     '10mg',  'Square',           'tablet'),
  ('Rolac',       'Ketorolac',        '10mg',  'ACI',              'tablet'),
  ('Flagyl',      'Metronidazole',    '400mg', 'Sanofi',           'tablet'),
  ('Azin',        'Azithromycin',     '500mg', 'Square',           'tablet'),
  ('Moxacil',     'Amoxicillin',      '500mg', 'Square',           'capsule'),
  ('Cef-3',       'Cefixime',         '200mg', 'Incepta',          'tablet'),
  ('Clopid',      'Clopidogrel',      '75mg',  'Beximco',          'tablet'),
  ('Cardipin',    'Cilnidipine',      '10mg',  'Incepta',          'tablet'),
  ('Pariet',      'Rabeprazole',      '20mg',  'Square',           'tablet'),
  ('Neurolep',    'Gabapentin',       '300mg', 'Renata',           'capsule'),
  ('Panadol',     'Paracetamol',      '500mg', 'GSK Bangladesh',   'tablet'),
  ('Salbair',     'Salbutamol',       '2mg',   'Opsonin',          'tablet'),
  ('Sergel',      'Esomeprazole',     '20mg',  'Healthcare',       'capsule'),
  ('Zifi',        'Cefixime',         '200mg', 'FDC',              'tablet'),
  ('Xorel',       'Cefuroxime',       '500mg', 'Opsonin',          'tablet'),
  ('Glinate MF',  'Glimepiride+Metformin', '1mg/500mg', 'Incepta', 'tablet'),
  ('Metfo',       'Metformin',        '500mg', 'Square',           'tablet'),
  ('Zimax',       'Azithromycin',     '500mg', 'Square',           'tablet'),
  ('Doxin',       'Doxycycline',      '100mg', 'Renata',           'capsule'),
  ('Suphala',     'Folic Acid',       '5mg',   'Beximco',          'tablet')
ON CONFLICT DO NOTHING;
