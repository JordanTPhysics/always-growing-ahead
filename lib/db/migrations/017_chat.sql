CREATE TABLE IF NOT EXISTS chat_conversations (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id            BIGINT UNSIGNED NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at         DATETIME NOT NULL,
  last_message_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_last_read_at  DATETIME NULL,
  admin_last_read_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat_conversations_user (user_id, expires_at),
  INDEX idx_chat_conversations_expires (expires_at),
  INDEX idx_chat_conversations_last (last_message_at DESC)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id       BIGINT UNSIGNED NOT NULL,
  sender_role     ENUM('user', 'admin') NOT NULL,
  body            TEXT NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat_messages_conversation (conversation_id, created_at, id)
);
