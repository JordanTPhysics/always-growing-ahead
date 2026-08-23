-- Imported directory workers can exist without a login account.
ALTER TABLE worker_profiles
  MODIFY user_id BIGINT UNSIGNED NULL;
