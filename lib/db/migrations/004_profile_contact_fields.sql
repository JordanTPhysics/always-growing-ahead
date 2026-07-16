-- Contact details on worker and employer profiles (revealed via subscription guard).

ALTER TABLE worker_profiles
  ADD COLUMN contact_email VARCHAR(255) NULL AFTER visibility,
  ADD COLUMN contact_phone VARCHAR(30) NULL AFTER contact_email,
  ADD COLUMN linkedin_url VARCHAR(500) NULL AFTER contact_phone;

ALTER TABLE employer_profiles
  ADD COLUMN contact_email VARCHAR(255) NULL AFTER website_url,
  ADD COLUMN contact_phone VARCHAR(30) NULL AFTER contact_email,
  ADD COLUMN linkedin_url VARCHAR(500) NULL AFTER contact_phone,
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
