ALTER TABLE worker_profiles
  ADD COLUMN actively_looking TINYINT(1) NOT NULL DEFAULT 0 AFTER visibility;

ALTER TABLE employer_profiles
  ADD COLUMN actively_hiring TINYINT(1) NOT NULL DEFAULT 0 AFTER linkedin_url;
