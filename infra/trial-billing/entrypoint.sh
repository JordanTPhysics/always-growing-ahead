#!/bin/sh
set -eu

apk add --no-cache curl tzdata

umask 077
printf '%s' "${CRON_SECRET:-}" > /run/cron-secret
chmod 600 /run/cron-secret

cat > /usr/local/bin/charge-trials <<'EOF'
#!/bin/sh
secret=$(cat /run/cron-secret)
exec curl -fsS -X POST -H "Authorization: Bearer ${secret}" http://app:3000/api/cron/charge-trials
EOF
chmod 700 /usr/local/bin/charge-trials

mkdir -p /etc/crontabs
printf '%s\n' '0 0 * * * /usr/local/bin/charge-trials' > /etc/crontabs/root

exec crond -f -l 8
