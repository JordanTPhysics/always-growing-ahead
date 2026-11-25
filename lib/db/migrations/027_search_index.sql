-- Side tables for multilingual search. Entity rows keep their original columns.
-- content_translations holds human source text and machine translations.
-- content_embeddings holds one vector per indexed document.
-- search_index_queue is drained in-process after a save and by /api/cron/search-index.

CREATE TABLE IF NOT EXISTS content_translations (
  entity_type   VARCHAR(32) NOT NULL,
  entity_id     BIGINT UNSIGNED NOT NULL,
  field_name    VARCHAR(32) NOT NULL,
  locale        VARCHAR(10) NOT NULL,
  source_locale VARCHAR(10) NOT NULL,
  origin        ENUM('human', 'machine') NOT NULL,
  source_hash   CHAR(64) NOT NULL,
  text          TEXT NOT NULL,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, entity_id, field_name, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_embeddings (
  entity_type  VARCHAR(32) NOT NULL,
  entity_id    BIGINT UNSIGNED NOT NULL,
  model        VARCHAR(128) NOT NULL,
  source_hash  CHAR(64) NOT NULL,
  vector       JSON NOT NULL,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_index_queue (
  entity_type   VARCHAR(32) NOT NULL,
  entity_id     BIGINT UNSIGNED NOT NULL,
  generation    INT UNSIGNED NOT NULL DEFAULT 0,
  attempts      INT UNSIGNED NOT NULL DEFAULT 0,
  available_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at     DATETIME NULL,
  last_error    VARCHAR(500) NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, entity_id),
  KEY idx_search_index_queue_ready (available_at, locked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_translation_usage (
  period_month    CHAR(7) NOT NULL PRIMARY KEY,
  characters_used INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
