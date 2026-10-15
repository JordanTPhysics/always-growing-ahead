ALTER TABLE users
  ADD COLUMN postcode VARCHAR(10) NULL AFTER district;

ALTER TABLE registration_attempts
  ADD COLUMN postcode VARCHAR(10) NULL AFTER district;
