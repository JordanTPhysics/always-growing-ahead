-- Homepage sponsored slides. Admins edit picture, tagline, and link.
CREATE TABLE IF NOT EXISTS sponsored_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(64) NOT NULL,
  href        VARCHAR(1000) NOT NULL,
  tagline     VARCHAR(300) NOT NULL,
  description VARCHAR(500) NULL,
  image_url   VARCHAR(1000) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sponsored_slug (slug),
  INDEX idx_sponsored_sort (sort_order, id)
);

INSERT INTO sponsored_items (slug, href, tagline, description, image_url, sort_order)
SELECT 'cscs-card', 'https://www.cscs.uk.com/', 'Get your CSCS card before your first site day', 'Book the health, safety & environment test and card application in one place.', '/images/cscs.jpg', 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sponsored_items WHERE slug = 'cscs-card');

INSERT INTO sponsored_items (slug, href, tagline, description, image_url, sort_order)
SELECT 'toolstation', 'https://www.toolstation.com/', 'Trade tools & PPE delivered next day', 'Hard hats, boots, and power tools from stores across the UK.', '/images/PPE-saves-logo.jpg', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sponsored_items WHERE slug = 'toolstation');

INSERT INTO sponsored_items (slug, href, tagline, description, image_url, sort_order)
SELECT 'city-guilds', 'https://www.cityandguilds.com/', 'Level up with a recognised trade qualification', 'Apprenticeships and NVQs in electrical, plumbing, carpentry, and more.', '/images/sponsored/city-guilds.png', 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sponsored_items WHERE slug = 'city-guilds');
