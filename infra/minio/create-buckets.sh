#!/bin/sh
set -eu

i=0
until mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "MinIO did not become ready in time."
    exit 1
  fi
  sleep 2
done

mc mb --ignore-existing "local/${MINIO_LIVE_BUCKET}"
mc mb --ignore-existing "local/${MINIO_TEST_BUCKET}"

# Private by default (CVs, certificates, profile photos).
# Education videos/PDFs should be fetched with short-lived presigned GET URLs.
mc anonymous set none "local/${MINIO_LIVE_BUCKET}"
mc anonymous set none "local/${MINIO_TEST_BUCKET}"
mc cors set "local/${MINIO_LIVE_BUCKET}" /cors.json
mc cors set "local/${MINIO_TEST_BUCKET}" /cors.json

echo "Buckets ready: ${MINIO_LIVE_BUCKET}, ${MINIO_TEST_BUCKET}"
