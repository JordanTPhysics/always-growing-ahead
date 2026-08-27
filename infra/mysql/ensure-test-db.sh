#!/bin/bash
# Idempotent. Init scripts in docker-entrypoint-initdb.d run only on an empty volume.
set -euo pipefail

: "${MYSQL_ROOT_PASSWORD:?}"
: "${MYSQL_TEST_DATABASE:?}"
: "${MYSQL_TEST_USER:?}"
: "${MYSQL_TEST_PASSWORD:?}"

mysql -h mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" --database=mysql <<-EOSQL
  CREATE DATABASE IF NOT EXISTS \`${MYSQL_TEST_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${MYSQL_TEST_USER}'@'%' IDENTIFIED BY '${MYSQL_TEST_PASSWORD}';
  ALTER USER '${MYSQL_TEST_USER}'@'%' IDENTIFIED BY '${MYSQL_TEST_PASSWORD}';
  GRANT ALL PRIVILEGES ON \`${MYSQL_TEST_DATABASE}\`.* TO '${MYSQL_TEST_USER}'@'%';
  FLUSH PRIVILEGES;
EOSQL

echo "Test database ready: ${MYSQL_TEST_USER}@% → ${MYSQL_TEST_DATABASE}"
