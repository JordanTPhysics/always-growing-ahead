-- Allow favouriting education resources; add education comments.
ALTER TABLE favourites
  MODIFY target_type ENUM('job', 'worker', 'employer', 'education') NOT NULL;

CREATE TABLE IF NOT EXISTS education_comments (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resource_id  BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  body         TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES education_resources(id) ON DELETE CASCADE,
  INDEX idx_education_comments_resource (resource_id, created_at DESC)
);
