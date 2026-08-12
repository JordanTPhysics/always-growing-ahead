-- Homepage news ticker excerpts managed by admins.
CREATE TABLE IF NOT EXISTS news_excerpts (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  body_en      VARCHAR(500) NOT NULL,
  body_ar      VARCHAR(500) NULL,
  body_ckb     VARCHAR(500) NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_by   BIGINT UNSIGNED NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_news_published (is_published, sort_order, id)
);
