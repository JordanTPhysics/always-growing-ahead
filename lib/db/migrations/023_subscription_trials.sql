CREATE TABLE IF NOT EXISTS subscription_trials (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                   BIGINT UNSIGNED NOT NULL,
  tier                      ENUM('basic','advanced') NOT NULL,
  billing_period            ENUM('monthly','yearly') NOT NULL,
  stripe_customer_id        VARCHAR(100) NOT NULL,
  stripe_payment_method_id  VARCHAR(100) NOT NULL,
  status                    ENUM('active','cancelled','expired','converted','charge_failed') NOT NULL DEFAULT 'active',
  trial_ends_at             DATETIME NOT NULL,
  cancelled_at              DATETIME NULL,
  converted_at              DATETIME NULL,
  stripe_subscription_id    VARCHAR(100) NULL,
  created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subscription_trials_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
