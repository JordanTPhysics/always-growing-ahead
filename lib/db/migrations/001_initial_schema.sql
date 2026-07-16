-- Phase 1 schema. skills before junction tables (FK order).
-- location_point is maintained in repositories (not a generated column) for reliable MySQL 8 SRID support.
-- MySQL SPATIAL INDEX requires NOT NULL, so indexes are deferred to Phase 2 once
-- searchable workers/jobs must have coordinates (then: NOT NULL + SPATIAL INDEX).

CREATE TABLE IF NOT EXISTS users (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      VARCHAR(255),
  phone              VARCHAR(30),
  preferred_locale   VARCHAR(10) DEFAULT 'en',
  subscription_tier  ENUM('none','basic','advanced') DEFAULT 'none',
  stripe_customer_id VARCHAR(100),
  email_verified_at  DATETIME NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  category  VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS worker_profiles (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id            BIGINT UNSIGNED NOT NULL UNIQUE,
  headline           VARCHAR(255),
  bio                TEXT,
  profile_photo_url  VARCHAR(500),
  cv_file_url        VARCHAR(500),
  location_lat       DECIMAL(10,7),
  location_lng       DECIMAL(10,7),
  location_point     POINT SRID 4326 NULL,
  postcode           VARCHAR(10),
  address_text       VARCHAR(255),
  desired_job_types  JSON,
  desired_salary_min INT,
  desired_salary_max INT,
  availability       ENUM('immediate','2_weeks','1_month','not_looking'),
  visibility         ENUM('public','hidden') DEFAULT 'public',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS worker_skills (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id    BIGINT UNSIGNED NOT NULL,
  skill_id     BIGINT UNSIGNED NOT NULL,
  proficiency  ENUM('beginner','intermediate','advanced','expert'),
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE KEY uq_worker_skill (worker_id, skill_id)
);

CREATE TABLE IF NOT EXISTS worker_experience (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id       BIGINT UNSIGNED NOT NULL,
  job_title       VARCHAR(255),
  employer_name   VARCHAR(255),
  start_date      DATE,
  end_date        DATE NULL,
  description     TEXT,
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS worker_qualifications (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id             BIGINT UNSIGNED NOT NULL,
  qualification_name    VARCHAR(255),
  institution            VARCHAR(255),
  year_awarded           YEAR,
  certificate_file_url   VARCHAR(500),
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employer_profiles (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id              BIGINT UNSIGNED NOT NULL UNIQUE,
  company_name         VARCHAR(255),
  company_description  TEXT,
  logo_url             VARCHAR(500),
  website_url          VARCHAR(500),
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employer_id      BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  job_type         ENUM('full-time','part-time','contract','temporary','apprenticeship'),
  location_lat     DECIMAL(10,7),
  location_lng     DECIMAL(10,7),
  location_point   POINT SRID 4326 NULL,
  postcode         VARCHAR(10),
  address_text     VARCHAR(255),
  salary_min       INT,
  salary_max       INT,
  salary_type      ENUM('hourly','daily','annual'),
  requirements     TEXT,
  status           ENUM('draft','active','closed','expired') DEFAULT 'draft',
  published_at     DATETIME NULL,
  expires_at       DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employer_id) REFERENCES employer_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_skills (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id     BIGINT UNSIGNED NOT NULL,
  skill_id   BIGINT UNSIGNED NOT NULL,
  required   BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE KEY uq_job_skill (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id        BIGINT UNSIGNED NOT NULL,
  worker_id     BIGINT UNSIGNED NOT NULL,
  initiated_by  ENUM('worker','employer'),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                 BIGINT UNSIGNED NOT NULL,
  tier                    ENUM('basic','advanced'),
  stripe_subscription_id  VARCHAR(100),
  status                  ENUM('active','past_due','canceled'),
  current_period_end      DATETIME,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO skills (name, category) VALUES
  ('Customer Service', 'Soft skills'),
  ('Forklift', 'Warehousing'),
  ('HGV Licence', 'Driving'),
  ('CSCS Card', 'Construction'),
  ('Food Hygiene', 'Hospitality'),
  ('Microsoft Office', 'Office'),
  ('Cash Handling', 'Retail'),
  ('First Aid', 'Health & safety'),
  ('Arabic', 'Languages'),
  ('Kurdish', 'Languages'),
  ('English', 'Languages'),
  ('Cleaning', 'Facilities'),
  ('Security SIA', 'Security'),
  ('Care Certificate', 'Care'),
  ('Plumbing', 'Trades'),
  ('Electrical', 'Trades'),
  ('Welding', 'Trades'),
  ('Warehouse Picking', 'Warehousing'),
  ('Reception', 'Office'),
  ('Sales', 'Retail');
