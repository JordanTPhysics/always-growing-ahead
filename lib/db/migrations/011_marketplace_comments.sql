CREATE TABLE IF NOT EXISTS marketplace_comments (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   VARCHAR(64) NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  body         TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_marketplace_comments_listing (listing_id, created_at DESC)
);
