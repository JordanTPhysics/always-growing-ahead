-- Directory businesses can exist without a login and still appear on the map.
ALTER TABLE employer_profiles
  MODIFY user_id BIGINT UNSIGNED NULL;

ALTER TABLE employer_profiles
  ADD COLUMN location_lat DECIMAL(10,7) NULL AFTER actively_hiring,
  ADD COLUMN location_lng DECIMAL(10,7) NULL AFTER location_lat,
  ADD COLUMN location_point POINT SRID 4326 NULL AFTER location_lng,
  ADD COLUMN postcode VARCHAR(10) NULL AFTER location_point,
  ADD COLUMN address_text VARCHAR(255) NULL AFTER postcode,
  ADD COLUMN external_id VARCHAR(128) NULL AFTER address_text,
  ADD UNIQUE KEY uq_employer_external_id (external_id);
