CREATE TABLE IF NOT EXISTS marketplace_listings (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(160) NOT NULL,
  description  TEXT,
  price        VARCHAR(40) NOT NULL DEFAULT '',
  location     VARCHAR(80) NOT NULL DEFAULT '',
  category     VARCHAR(80) NOT NULL DEFAULT 'Other',
  media_type   ENUM('image','video') NOT NULL,
  media_url    VARCHAR(512) NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_marketplace_listings_created (created_at DESC),
  INDEX idx_marketplace_listings_user_created (user_id, created_at DESC)
);
