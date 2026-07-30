CREATE TABLE IF NOT EXISTS favourites (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  target_type  ENUM('job', 'worker', 'employer') NOT NULL,
  target_id    BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_favourite (user_id, target_type, target_id),
  INDEX idx_favourites_user (user_id, created_at DESC)
);
