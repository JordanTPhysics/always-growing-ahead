#!/bin/bash
# Sourced by the official mysql image on first boot (empty data dir only).
# Live DB + user come from MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD.

set -euo pipefail

if ! command -v docker_process_sql >/dev/null 2>&1; then
  docker_process_sql() {
    mysql --user=root --password="${MYSQL_ROOT_PASSWORD}" "$@"
  }
fi

docker_process_sql --database=mysql <<-EOSQL
  CREATE DATABASE IF NOT EXISTS \`${MYSQL_TEST_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${MYSQL_TEST_USER}'@'%' IDENTIFIED BY '${MYSQL_TEST_PASSWORD}';
  GRANT ALL PRIVILEGES ON \`${MYSQL_TEST_DATABASE}\`.* TO '${MYSQL_TEST_USER}'@'%';
  FLUSH PRIVILEGES;
EOSQL
