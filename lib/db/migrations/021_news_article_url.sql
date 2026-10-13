-- Optional link from a homepage news excerpt to the full article.
ALTER TABLE news_excerpts
  ADD COLUMN article_url VARCHAR(1000) NULL AFTER body_ckb;
