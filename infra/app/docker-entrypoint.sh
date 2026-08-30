#!/bin/sh
set -eu

# Next.js inlines process.env.NEXT_PUBLIC_* at `next build` (empty in Docker).
# Copy the runtime value onto a non-public name the server can actually read.
if [ -z "${GOOGLE_MAPS_API_KEY:-}" ]; then
  GOOGLE_MAPS_API_KEY="${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-}"
  export GOOGLE_MAPS_API_KEY
fi
if [ -z "${GOOGLE_MAPS_MAP_ID:-}" ]; then
  GOOGLE_MAPS_MAP_ID="${NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID:-}"
  export GOOGLE_MAPS_MAP_ID
fi

exec "$@"
