ALTER TABLE door_knock_neighborhoods ADD COLUMN IF NOT EXISTS zoom_level integer DEFAULT 17;
ALTER TABLE door_knock_neighborhoods ADD COLUMN IF NOT EXISTS address text;
