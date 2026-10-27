CREATE TABLE IF NOT EXISTS marketplace_likes (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id   VARCHAR(64) NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_marketplace_like (user_id, listing_id),
  INDEX idx_marketplace_likes_listing (listing_id)
);
