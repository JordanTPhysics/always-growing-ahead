# AGA VPS stack (IONOS)

## Install on a VPS

SSH in as root (Ubuntu/Debian). Clone the repo (deploy key if it is private), then run the install script:

```bash
# once: add this VPS public key as a GitHub deploy key, then:
git clone git@github.com:JordanTPhysics/always-growing-ahead.git /opt/aga
sudo bash /opt/aga/infra/install.sh
```

If git is not installed yet, copy the script first:

```bash
# on your laptop
scp infra/install.sh root@YOUR_VPS_IP:/root/install.sh

# on the VPS
sudo REPO_URL=git@github.com:JordanTPhysics/always-growing-ahead.git bash /root/install.sh
```

The first run copies env examples (it will **not** overwrite existing `.env` files), then stops so you can paste secrets. Re-run the same command after editing:

- `/opt/aga/infra/.env` — MySQL + MinIO passwords, `APP_SITE_ADDRESS=alwaysgrowingahead.com`, `FILES_SITE_ADDRESS=files.alwaysgrowingahead.com`
- `/opt/aga/.env` — `AUTH_SECRET`, `SMTP_PASSWORD`, Stripe, Maps

## DNS

Point these A records at the VPS IP before Caddy can issue HTTPS certificates:

| Name | Type | Target |
|---|---|---|
| `@` (alwaysgrowingahead.com) | A | VPS IP |
| `files` | A | VPS IP |

Mail for `admin@alwaysgrowingahead.com` stays on IONOS mail (`smtp.ionos.com`). Put that mailbox password in `SMTP_PASSWORD`. Do not run an SMTP daemon on the VPS — IONOS blocks outbound port 25.

After that it installs Docker if needed, starts MySQL/MinIO, migrates both databases, builds the Next.js app, and puts Caddy on ports 80/443.

## What runs

| Service | Role |
|---|---|
| `app` | Next.js (proxied by Caddy on port 80/443) |
| `mysql` | MySQL 8.4. Creates `AGA` (live) and `AGA_test` (test) on first boot |
| `minio` | S3-compatible object storage for PDFs, videos, photos |
| `minio-init` | Creates private buckets `aga-live` and `aga-test`, then exits |
| `caddy` | Public HTTP(S) for the app and the S3 API |
| `migrate` / `migrate-test` | One-shot schema apply (`--profile tools`) |

## First boot (manual, if you skip the install script)

```bash
cd infra
cp .env.example .env
cp env.app.vps.example ../.env
nano .env
nano ../.env
docker compose up -d mysql minio
docker compose run --rm --no-deps minio-init
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm migrate-test
docker compose up -d --build app caddy
```

Browser CORS is set in Caddy (community MinIO has no bucket CORS API). Recreate Caddy after Caddyfile changes:

```bash
docker compose up -d --force-recreate caddy
```

4. Point the Next.js app at MinIO (already set in `env.app.vps.example` when the app runs in Compose):

```
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_URL=https://files.alwaysgrowingahead.com
S3_ACCESS_KEY_ID=<MINIO_ROOT_USER>
S3_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD>
S3_BUCKET_NAME=aga-live
S3_FORCE_PATH_STYLE=1
```

Staging uses `aga_test` / `AGA_test` and `S3_BUCKET_NAME=aga-test`. Leave `S3_ENDPOINT` empty for local `public/uploads`.

Init SQL only runs when the MySQL volume is empty. Later schema changes are always `migrate` / `migrate-test`.

## IONOS firewall

Default Linux policy already allows 22, 80, 443. Add **3306 only if the app is not on this VPS** (e.g. Netlify), and never as `0.0.0.0/0` if you can avoid it.

| Port | Purpose |
|---|---|
| 22 | SSH |
| 80 / 443 | App + HTTPS (Caddy). Path `/aga-live/` and `/aga-test/` go to MinIO until you use a files. subdomain |
| 3306 | Bound to localhost only — do not open this in the IONOS firewall |
| 9000 / 9001 | Keep closed. Console: `ssh -L 9001:127.0.0.1:9001 user@vps` then http://127.0.0.1:9001 |

## File store

Do **not** keep using `public/uploads` on the Next.js host. That path is local disk: it disappears on Netlify, cannot accept 200MB videos through serverless limits, and does not belong in git.

**Use MinIO on this VPS (already in Compose).** Talk to it with the AWS S3 API (`forcePathStyle: true`).

Recommended flow for PDFs and videos:

1. Browser asks the Next.js API for a **presigned PUT URL**.
2. Browser uploads **directly to Caddy → MinIO** (bypasses Netlify/serverless body limits).
3. API stores the object key (and bucket) in MySQL.
4. Playback/download uses a short-lived **presigned GET URL** (buckets are private).

Object keys (examples):

```
uploads/education/{userId}/{uuid}.mp4
uploads/education/{userId}/{uuid}.pdf
uploads/profiles/{userId}/{uuid}.jpg
uploads/certificates/{userId}/{uuid}.pdf
```

Live vs test = different buckets (`aga-live` / `aga-test`), same key layout.

When DNS exists, set:

```
FILES_SITE_ADDRESS=files.yourdomain.com
MINIO_SERVER_URL=https://files.yourdomain.com
```

Caddy will then issue a Let's Encrypt certificate. Until then, `:80` serves HTTP on the VPS IP.

### Why not a folder on disk behind nginx?

Fine for tiny images if the app runs **on the same machine**. It is a poor fit here: the app is separate, videos need range requests and large uploads, and you would have to invent an upload API that MinIO already is. MinIO also matches the project's planned S3/R2 interface, so switching to IONOS Object Storage or Cloudflare R2 later is mostly an endpoint/credential change.

### IONOS Object Storage

IONOS sells S3-compatible object storage as an add-on. Use that instead of MinIO if you do not want to operate disks for video. Keep MySQL on the VPS either way. Put MySQL and object data on **separate volumes** (IONOS Block Storage for MySQL when the OS disk gets tight).

## Backups

```bash
docker compose exec mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --databases AGA AGA_test \
  --single-transaction --routines --triggers \
  > aga-$(date +%F).sql
```

Copy `/var/lib/docker/volumes/aga_minio_data/_data` (or enable `mc mirror`) for files. Test a restore before you need it.

## Local smoke test (Windows)

From `infra/`, with Docker Desktop running: `docker compose up -d`. MySQL is on `127.0.0.1:3306`. Then from the repo root: `npm run db:migrate`.
