# AGA

UK job search & employment marketplace (Next.js App Router).

## Phase 1 status

Foundations are in place:

- Auth.js (email/password + optional Google)
- `[locale]` routing with **next-intl** (`en` + `ar`, RTL-aware layout)
- MySQL schema + migration runner
- Repository data layer (`lib/db/repositories/*`)
- Worker / employer profile CRUD
- Job CRUD (list browse only — map search is Phase 2)
- Entitlement helpers ready for Stripe (Phase 3)

## Setup

1. Copy `.env.example` → `.env.local` and fill DB + `AUTH_SECRET`.
2. Create a MySQL 8 database user/password as needed.
3. Run migrations:

```bash
npm run db:migrate
```

4. For the IONOS VPS, run [`infra/install.sh`](infra/install.sh) (see [`infra/README.md`](infra/README.md)).

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/en`).

### Mock test accounts (`USE_MOCK_MAP_DATA=1`)

Seed demo profiles/jobs (and MySQL users when the DB is available):

```bash
npm run seed:mock
```

| Email | Password | Tier |
|---|---|---|
| `full@aga.test` | `password123` | Advanced (full — worker + employer/jobs) |
| `worker@aga.test` | `password123` | Basic (worker subscription only) |

With mock map data enabled, these logins work even without MySQL.

### Dev-only tier switch (until Stripe)

```bash
curl -X POST http://localhost:3000/api/dev/set-tier \
  -H "Content-Type: application/json" \
  --cookie "..." \
  -d "{\"tier\":\"advanced\"}"
```

In development, job posting is allowed without Advanced so Phase 1 CRUD is usable.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `lib/db/migrations/*.sql` |
| `npm run seed:mock` | Seed mock test accounts + demo JSON data |
