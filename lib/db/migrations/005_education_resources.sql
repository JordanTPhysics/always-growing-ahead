-- Education / training guides (PDF and video) managed by admins.
CREATE TABLE IF NOT EXISTS education_resources (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic           VARCHAR(255) NOT NULL,
  media_type      ENUM('pdf','video') NOT NULL,
  file_url        VARCHAR(500) NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  byte_size       INT UNSIGNED NOT NULL,
  title_en        VARCHAR(255) NOT NULL,
  title_ar        VARCHAR(255) NULL,
  title_ckb       VARCHAR(255) NULL,
  description_en  TEXT NULL,
  description_ar  TEXT NULL,
  description_ckb TEXT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  is_published    TINYINT(1) NOT NULL DEFAULT 1,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_education_published_topic (is_published, topic, sort_order)
);
