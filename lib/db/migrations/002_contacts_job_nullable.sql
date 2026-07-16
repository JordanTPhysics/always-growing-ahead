-- Basic-tier users can reveal worker contact without posting a job.
ALTER TABLE contacts
  MODIFY job_id BIGINT UNSIGNED NULL;
