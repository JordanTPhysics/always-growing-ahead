-- Browser push subscriptions are longer than an FCM device token.
-- A hash keeps the unique key inside InnoDB's index length limit.
ALTER TABLE device_tokens
  ADD COLUMN token_hash CHAR(64) NULL AFTER token;

UPDATE device_tokens
SET token_hash = SHA2(token, 256)
WHERE token_hash IS NULL;

ALTER TABLE device_tokens
  DROP INDEX token;

ALTER TABLE device_tokens
  MODIFY COLUMN token TEXT NOT NULL;

ALTER TABLE device_tokens
  MODIFY COLUMN token_hash CHAR(64) NOT NULL;

ALTER TABLE device_tokens
  ADD UNIQUE KEY device_tokens_token_hash (token_hash);
