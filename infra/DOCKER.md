# AGA Docker commands

Run these on the VPS after SSH. Almost everything is `docker compose` from the stack folder.

```bash
cd /opt/aga/infra
```

Compose reads `infra/.env` (MySQL, MinIO, Caddy) and `/opt/aga/.env` (app secrets, Stripe). Stay in `infra/` so those files resolve correctly.

Project name is `aga`. Services: `app`, `mysql`, `minio`, `caddy`. One-shot tools: `migrate`, `migrate-test`, `ensure-test-db`, `minio-init`.

---

## See what is running

```bash
# Snapshot of each service: Up/Exit, ports, health. First check when the site looks down.
docker compose ps

# Live CPU / RAM / disk I/O per container. Use when the VPS feels slow or MySQL is starving the app.
docker stats
```

---

## Logs

```bash
# Follow the Next.js app. Use after a deploy, a 500, or a failed Stripe webhook (app handles /api/webhooks/stripe).
docker compose logs -f app

# Last 200 lines only, no follow. Use when you want a pasteable error without sitting on the stream.
docker compose logs --tail=200 app

# Caddy access/TLS errors. Use when HTTPS fails, the domain does not resolve, or files.alwaysgrowingahead.com 502s.
docker compose logs -f caddy

# MySQL startup / connection refused. Use when the app cannot talk to the database.
docker compose logs -f mysql

# Same idea for object storage (uploads, presigned URLs).
docker compose logs -f minio

# Every service at once. Noisy; use when you do not know which layer broke.
docker compose logs -f
```

Ctrl+C stops following; it does not stop the containers.

---

## Start, stop, restart

```bash
# Start anything that is not running, using existing images. Use after a reboot or if you previously ran `stop`.
docker compose up -d

# Stop containers but keep them (and their names). Use for a short pause; `up -d` brings the same containers back.
docker compose stop

# Stop and remove containers, keep volumes (MySQL data, MinIO files, Caddy certs). Use when you want a clean process list without wiping data.
docker compose down

# Same as down, plus DELETE mysql_data / minio_data / caddy_data. Destroys the database and uploads. Almost never use this on prod.
docker compose down -v
```

Restart vs recreate:

```bash
# Bounce a process with the env it already has. Use for a stuck Node process. Does NOT pick up new /opt/aga/.env values.
docker compose restart app

# Recreate the app container so it re-reads env files. Use after editing Stripe keys, AUTH_URL, SMTP, etc.
docker compose up -d --force-recreate --no-deps app
```

`--no-deps` avoids restarting MySQL/MinIO when you only changed app config.

---

## Deploy code (git pull)

Either re-run the installer (pulls `main`, migrates, rebuilds) or do it by hand:

```bash
# Full path: pull, migrate, rebuild app + Caddy. Use when you just pushed to main and want prod to match.
sudo bash /opt/aga/infra/install.sh
```

Manual equivalent:

```bash
cd /opt/aga
git pull --ff-only origin main

cd /opt/aga/infra

# Apply new SQL in lib/db/migrations to the live AGA database. Use after a pull that added a migration.
docker compose --profile tools run --rm migrate

# Same for AGA_test. Use if you keep a staging schema on this box.
docker compose --profile tools run --rm migrate-test

# Rebuild the Next.js image from the new code and replace the running app. Use after any app/source change.
docker compose up -d --build app

# Recreate Caddy only. Use after editing infra/Caddyfile (TLS, reverse proxy, CORS).
docker compose up -d --force-recreate caddy
```

`install.sh` does **not** overwrite existing `.env` files.

---

## Env changes (Stripe, AUTH_URL, SMTP)

1. Edit `/opt/aga/.env` (app) or `/opt/aga/infra/.env` (MySQL/MinIO/Caddy).
2. Recreate the service that consumes that file.

```bash
# App secrets (Stripe price ids, webhook secret, AUTH_URL, SMTP).
docker compose up -d --force-recreate --no-deps app

# DB / MinIO / Caddy hostnames and passwords live in infra/.env. Recreate the matching service.
docker compose up -d --force-recreate mysql
docker compose up -d --force-recreate minio
docker compose up -d --force-recreate caddy
```

`restart` is not enough for env file changes.

---

## Database

```bash
# Interactive MySQL as the app user. Use to inspect users, subscriptions, or confirm a webhook wrote a row.
docker compose exec mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"

# One-off query without opening a shell. Example: count users.
docker compose exec mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, email, subscription_tier FROM users LIMIT 20;"

# Logical backup of live + test DBs to a file on the VPS. Run before risky deploys or schema changes.
docker compose exec mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --databases AGA AGA_test --single-transaction --routines --triggers' > /root/aga-$(date +%F).sql
```

If `$MYSQL_USER` is empty in your shell, those values are in `infra/.env` — either `source` them or paste the user/password.

Init SQL in `infra/mysql/init` only runs on an **empty** MySQL volume. Later schema changes are always `migrate` / `migrate-test`.

---

## Files (MinIO)

```bash
# Create aga-live / aga-test buckets if they are missing. Safe to re-run; use after a MinIO recreate or a fresh volume.
docker compose run --rm --no-deps minio-init
```

MinIO console is localhost-only. From your laptop:

```bash
# Tunnel port 9001, then open http://127.0.0.1:9001 in a browser. Use to inspect buckets without opening 9001 on the firewall.
ssh -L 9001:127.0.0.1:9001 root@YOUR_VPS_IP
```

---

## Shells inside containers

```bash
# Shell in the app container. Use to print env (Stripe keys present?), curl itself, or check Node.
docker compose exec app sh

# Confirm the app process sees the vars you just set (do not paste secrets into chat/logs).
docker compose exec app sh -c 'echo STRIPE_SECRET_KEY is ${STRIPE_SECRET_KEY:+set}'
```

---

## Health / “is the site up?”

```bash
# Hit Next.js on the loopback publish port. Use on the VPS to separate “Caddy/TLS is broken” from “the app is down”.
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/

# Hit the public hostname through Caddy. Use to confirm HTTPS and the reverse proxy.
curl -sS -o /dev/null -w "%{http_code}\n" https://alwaysgrowingahead.com/

# Stripe webhook path must be reachable without a locale prefix (not /en/api/...).
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://alwaysgrowingahead.com/api/webhooks/stripe
```

A webhook POST without Stripe’s signature header should return **400** (missing signature) or **503** (secret missing). **404** means Caddy/routing is wrong.

---

## Disk space

```bash
# Image + volume usage. Use when the VPS disk is filling up.
docker system df

# Delete unused images/build cache. Use after several --build deploys. Does not delete named volumes (your DB/files).
docker image prune -f
docker builder prune -f
```

Do not run `docker system prune -a --volumes` on prod.

---

## Typical sequences

**Pushed code to GitHub, update prod**

```bash
sudo bash /opt/aga/infra/install.sh
docker compose -f /opt/aga/infra/docker-compose.yml logs -f app
```

**Changed Stripe keys in `/opt/aga/.env`**

```bash
cd /opt/aga/infra
docker compose up -d --force-recreate --no-deps app
docker compose logs -f app
```

**Site down**

```bash
cd /opt/aga/infra
docker compose ps
docker compose logs --tail=100 app caddy
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```
