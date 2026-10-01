CREATE TABLE IF NOT EXISTS registration_attempts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NULL,
  email         VARCHAR(255) NULL,
  phone         VARCHAR(100) NULL,
  city          VARCHAR(100) NULL,
  district      VARCHAR(100) NULL,
  error_message TEXT NOT NULL,
  locale        VARCHAR(10) DEFAULT 'en',
  status        ENUM('new', 'contacted', 'resolved') NOT NULL DEFAULT 'new',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_registration_attempts_status_created (status, created_at)
);
