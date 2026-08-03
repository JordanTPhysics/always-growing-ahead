-- Split education videos into short videos and lectures.
ALTER TABLE education_resources
  MODIFY media_type ENUM('pdf', 'short_video', 'lecture', 'video') NOT NULL;

UPDATE education_resources
SET media_type = 'short_video'
WHERE media_type = 'video';

ALTER TABLE education_resources
  MODIFY media_type ENUM('pdf', 'short_video', 'lecture') NOT NULL;
