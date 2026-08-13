# UK Job Search & Employment Marketplace — Build Specification

> **Purpose of this document:** This is a full product + technical spec intended to be pasted into Cursor as the initial project context. It covers architecture, database design, feature specs, and a phased build order. Sections marked **⚠️ Note** flag places worth a second look as you build.

---

## 1. Project Overview

A two-sided geo-based marketplace connecting **Workers** (job seekers) and **Employers** in the UK.

- **Region:** UK only (GBP currency, UK postcodes, UK GDPR/Data Protection Act 2018)
- **Platforms:** Responsive web app (mobile-first, desktop-usable) + native iOS/Android via Capacitor
- **Languages:** English (default), Arabic, and Kurdish at launch. English and Kurmanji-script Kurdish read left-to-right; Arabic and Sorani-script Kurdish read right-to-left — the UI is built to handle both directions per-locale, not per-language-family, so additional languages are a content task, not a code change (see Section 6)
- **Core loop:** Workers build a profile → Employers post jobs → both sides search a map of the other → contact info is revealed for paying users

---

## 2. User Roles & Subscription Model

### Roles
- **Worker** — builds a profile, searches jobs
- **Employer** — posts jobs, searches workers
- **Admin** — moderation, support

**Confirmed:** A single account can hold both a worker profile and an employer/job-posting section, accessed as separate areas of the app (e.g. a "Switch to hiring" toggle in nav), gated by the same per-user subscription tier. No separate account types needed.

**Confirmed:** Identity/right-to-work verification is handled outside the app (not an MVP build concern).

### Subscription Tiers (per user, via Stripe)
| Tier | Capabilities |
|---|---|
| **Basic** | Search jobs (map + filters), search workers (map + filters), create/edit worker profile, view full job descriptions, **view contact info** on jobs/worker profiles |
| **Advanced** | Everything in Basic **+ create/manage job postings** (employer side) |

**Confirmed:** No free trial for now. Contact info reveal requires at least Basic — there is no tier below Basic that can search/create a profile without paying.

**⚠️ Note — build for future extensibility anyway:** you mentioned a free-trial tier (search + profile creation + JD viewing, but no contact info) as a possible future addition. The entitlement check below is written as a small reusable function rather than inline tier checks scattered through the code, so adding a `trial` tier later is a one-place change, not a refactor:

```ts
// lib/entitlements.ts
type Tier = 'none' | 'basic' | 'advanced'; // 'trial' can be inserted later with no callers changing

export function canViewContactInfo(tier: Tier) {
  return tier === 'basic' || tier === 'advanced';
}
export function canPostJobs(tier: Tier) {
  return tier === 'advanced';
}
```

**Confirmed:** No in-app messaging for MVP. Contact action reveals contact info directly (phone/email) rather than opening a chat thread. Flagged as a clean v2 addition — the `contacts` table (Section 4) already logs the event so a messaging feature can build on top of it later without new data modeling.

---

## 3. Tech Stack

### Confirmed
- **Frontend:** Next.js 14+ (App Router), TypeScript
- **Data access:** Next.js Route Handlers (API routes)
- **Database:** MySQL
- **ORM:** None — custom data access layer (see Section 4 for pattern)
- **Payments:** Stripe Billing (Subscriptions + Checkout + Customer Portal)
- **Mobile:** Capacitor (wraps the web app for iOS/Android)
- **AI:** Not part of this product

### Recommended additions
| Concern | Recommendation | Why |
|---|---|---|
| Styling | **Tailwind CSS** + shadcn/ui | Fast, consistent, mobile-first utility classes |
| Auth | **Auth.js (NextAuth v5)** | Credentials + Google OAuth, session handling, works with Next.js App Router |
| MySQL driver | **mysql2** (with connection pooling) | Fast, well-maintained, supports prepared statements and promises natively — the right low-level driver to build a custom data layer on |
| Query building | Hand-written SQL in a repository layer (see Section 4), optionally with **Kysely** if you want typed query-building without a full ORM's abstraction — your call, both fit "custom data model" | Keeps you in control of the schema and queries as requested, while still getting TypeScript safety if you want it |
| Migrations | Plain versioned `.sql` files run via a small custom migration runner, or a lightweight tool like **db-migrate** | Avoids ORM lock-in while keeping schema changes trackable |
| Maps | **Mapbox GL JS** (via `react-map-gl`) | Cheaper than Google Maps at scale, excellent UK coverage, native clustering support |
| Geocoding | **Ideal Postcodes** or **getAddress.io** for UK postcode lookup | UK-specific postcode APIs are far more accurate than generic geocoders for this market |
| i18n | **next-intl** | Best-supported i18n library for the App Router; handles locale routing, message files, pluralization, and works cleanly with Server Components |
| File storage | **Cloudflare R2** or **AWS S3** | CVs, profile photos, company logos |
| Transactional email | **Resend** or **Postmark** | Verification emails, notifications |
| Push notifications | **Firebase Cloud Messaging** via Capacitor plugin | New contact alerts on mobile |
| Hosting (web) | **Netlify** | Native Next.js support, edge functions, easy preview deployments |

### ⚠️ Critical architecture note: Capacitor + Next.js API routes
Capacitor loads either a **static bundle** or a **live remote URL** in a native WebView — it cannot execute Next.js server-side API routes on-device. Since you're using Next.js API routes for data access, the correct setup is:

- Deploy the full Next.js app (frontend + API routes) to Netlify as normal, with a real public URL (e.g. `app.scanjob.co.uk`).
- Configure Capacitor to **point the native shell at that live URL** (`server.url` in `capacitor.config.ts`), rather than doing a static `next export`.
- This gives you a genuine hybrid app: native shell + native plugin access (camera, geolocation, push), while all rendering and data access still goes through your live Next.js deployment.
- Do **not** use `output: 'export'` in `next.config.js` — that disables API routes, middleware, and dynamic rendering, all of which you need here.

---

## 4. Database Schema (MySQL) & Data Access Pattern

Since you're building a custom data model rather than using an ORM, the recommended pattern is a **repository layer**: one file per entity in `/lib/db/repositories/`, each exporting plain typed functions (`getJobById`, `createWorkerProfile`, `searchJobsByLocation`, etc.) that wrap raw parameterized SQL via `mysql2`. Route handlers call repository functions — they never write raw SQL inline. This keeps queries centralized, testable, and easy to migrate off `mysql2` later if you ever want to.

```ts
// lib/db/repositories/jobs.ts
import { pool } from '@/lib/db/pool';
import type { Job } from '@/lib/db/types';

export async function getActiveJobsNear(lat: number, lng: number, radiusMeters: number, filters: JobFilters): Promise<Job[]> {
  const [rows] = await pool.execute(
    `SELECT *, ST_Distance_Sphere(location_point, POINT(?, ?)) AS distance_m
     FROM jobs
     WHERE status = 'active'
       AND ST_Distance_Sphere(location_point, POINT(?, ?)) <= ?
       ${filters.jobType ? 'AND job_type = ?' : ''}
     ORDER BY distance_m ASC
     LIMIT 100`,
    [lng, lat, lng, lat, radiusMeters, ...(filters.jobType ? [filters.jobType] : [])]
  );
  return rows as Job[];
}
```

### Schema (raw SQL DDL)

```sql
CREATE TABLE users (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      VARCHAR(255),
  phone              VARCHAR(30),
  preferred_locale   VARCHAR(10) DEFAULT 'en',
  subscription_tier  ENUM('none','basic','advanced') DEFAULT 'none',
  stripe_customer_id VARCHAR(100),
  email_verified_at  DATETIME NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE worker_profiles (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id            BIGINT UNSIGNED NOT NULL UNIQUE,
  headline           VARCHAR(255),
  bio                TEXT,
  profile_photo_url  VARCHAR(500),
  cv_file_url        VARCHAR(500),
  location_lat       DECIMAL(10,7),
  location_lng       DECIMAL(10,7),
  location_point     POINT GENERATED ALWAYS AS (POINT(location_lng, location_lat)) STORED SRID 4326,
  postcode           VARCHAR(10),
  address_text       VARCHAR(255),
  desired_job_types  JSON,
  desired_salary_min INT,
  desired_salary_max INT,
  availability       ENUM('immediate','2_weeks','1_month','not_looking'),
  visibility         ENUM('public','hidden') DEFAULT 'public',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  SPATIAL INDEX idx_worker_location (location_point)
);

CREATE TABLE worker_skills (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id    BIGINT UNSIGNED NOT NULL,
  skill_id     BIGINT UNSIGNED NOT NULL,
  proficiency  ENUM('beginner','intermediate','advanced','expert'),
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE worker_experience (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id       BIGINT UNSIGNED NOT NULL,
  job_title       VARCHAR(255),
  employer_name   VARCHAR(255),
  start_date      DATE,
  end_date        DATE NULL,
  description     TEXT,
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
);

CREATE TABLE worker_qualifications (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id             BIGINT UNSIGNED NOT NULL,
  qualification_name    VARCHAR(255),
  institution            VARCHAR(255),
  year_awarded           YEAR,
  certificate_file_url   VARCHAR(500),
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
);

CREATE TABLE employer_profiles (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id              BIGINT UNSIGNED NOT NULL UNIQUE,
  company_name         VARCHAR(255),
  company_description  TEXT,
  logo_url             VARCHAR(500),
  website_url          VARCHAR(500),
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE jobs (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employer_id      BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  job_type         ENUM('full-time','part-time','contract','temporary','apprenticeship'),
  location_lat     DECIMAL(10,7),
  location_lng     DECIMAL(10,7),
  location_point   POINT GENERATED ALWAYS AS (POINT(location_lng, location_lat)) STORED SRID 4326,
  postcode         VARCHAR(10),
  address_text     VARCHAR(255),
  salary_min       INT,
  salary_max       INT,
  salary_type      ENUM('hourly','daily','annual'),
  requirements     TEXT,
  status           ENUM('draft','active','closed','expired') DEFAULT 'draft',
  published_at     DATETIME NULL,
  expires_at       DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employer_id) REFERENCES employer_profiles(id) ON DELETE CASCADE,
  SPATIAL INDEX idx_job_location (location_point)
);

CREATE TABLE job_skills (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id     BIGINT UNSIGNED NOT NULL,
  skill_id   BIGINT UNSIGNED NOT NULL,
  required   BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE skills (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  category  VARCHAR(100)
);

-- Logs a contact-info reveal / click-through event between a worker and a job.
-- Deliberately simple (no thread/messages) since in-app messaging is out of scope for now,
-- but this table is the natural foundation to build messaging on top of later.
CREATE TABLE contacts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id        BIGINT UNSIGNED NOT NULL,
  worker_id     BIGINT UNSIGNED NOT NULL,
  initiated_by  ENUM('worker','employer'),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                 BIGINT UNSIGNED NOT NULL,
  tier                    ENUM('basic','advanced'),
  stripe_subscription_id  VARCHAR(100),
  status                  ENUM('active','past_due','canceled'),
  current_period_end      DATETIME,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Radius search example** (used by both Job Search and Employee Search — see Section 5):
```sql
SELECT *, ST_Distance_Sphere(location_point, POINT(:lng, :lat)) AS distance_m
FROM jobs
WHERE status = 'active'
  AND ST_Distance_Sphere(location_point, POINT(:lng, :lat)) <= :radius_m
ORDER BY distance_m ASC;
```

---

## 5. Feature Specifications

### 5.1 Auth & Onboarding
- Email/password + Google OAuth
- After signup: a single account with access to **both** a "Find Work" section and a "Hire" section, switchable via nav toggle. The Hire section's job-posting action is gated by Advanced tier (Section 2).
- Email verification required before job posting or revealing contact info.

### 5.2 Job Search (Worker-facing)
- Filters: city/postcode + radius, job type, salary range, date posted, skill tags
- Results shown as **map view** (default) with a **list/toggle view** for accessibility and desktop convenience
- Markers cluster at low zoom (Mapbox built-in clustering), split apart on zoom/tap
- Tapping a marker → bottom sheet (mobile) / side panel (desktop) with: job title, employer name, salary, distance, snippet
- "View full job" → full JD page with requirements and employer profile link
- Contact info (phone/email) is shown on the JD page **only if the viewer's subscription tier is Basic or Advanced**; otherwise a paywall prompt replaces it. Viewing the JD itself is not gated — only the contact info.
- Viewing contact info logs a row in `contacts`.

### 5.3 Employee Search (Employer-facing)
- Mirrors 5.2: filters by location/radius, desired job type, skill tags, availability
- Only shows workers with `visibility = 'public'`
- Marker tap → worker's public profile summary (headline, top skills, distance, availability)
- "View full profile" → full profile with experience, qualifications, skills
- Contact info reveal same tier gating as 5.2

### 5.4 Worker Profile Setup
- Multi-step wizard: basic info → location (postcode lookup with autocomplete) → skills (searchable tag picker against the `skills` taxonomy, with ability to add custom skills for admin review) → experience (repeatable entries) → qualifications (repeatable, optional certificate upload) → availability & desired salary → visibility toggle

### 5.5 Job Profile Setup (Employer)
- One employer can create multiple job postings (1:many, already in schema)
- Wizard: job title & type → location → salary → requirements/skills (tag picker, required vs nice-to-have) → full description → review → publish (or save as draft)
- Dashboard listing all jobs with status (draft/active/closed/expired), contact-view count per job, edit/close/renew actions
- Gated behind Advanced tier (create/publish actions); Basic-tier users attempting this see an upgrade prompt.

### 5.6 Subscription & Billing
- Stripe Checkout for tier purchase/upgrade (none → Basic → Advanced)
- Stripe Customer Portal linked for plan management, cancellation, invoices
- Webhook handler (`/api/webhooks/stripe`) syncs the `subscriptions` table and `users.subscription_tier` on payment events
- Server-side tier check on every gated route (job posting, contact reveal) via the `entitlements.ts` helpers in Section 2 — never trust client-side tier state

---

## 6. Language Support (i18n) — including RTL

**Goal:** all UI text swappable to another language, with seamless switching for the user (no jarring reload, choice remembered). Launch languages are **English, Arabic, and Kurdish**. You'll supply the translated text; the system needs to be structured so adding a language is a content task, not a code change.

**Kurdish note (confirmed: build flexible support for either variant):** Kurdish is written two different ways depending on region/community — **Sorani** (Arabic script, right-to-left, used mainly by Iraqi/Iranian Kurdish communities) and **Kurmanji** (Latin script, left-to-right, used mainly by Turkish/Syrian Kurdish communities). Rather than guessing which one your users need, the architecture treats direction and script as a **per-locale property**, not an assumption baked in per language — so `ckb` (Sorani) and `kmr` (Kurmanji) can both exist as separate selectable languages, and you decide later whether to ship one or both, purely by adding/omitting translation files. No code branches on "is this Kurdish."

### Locale configuration
```ts
// lib/i18n/locales.ts
export const locales = {
  en:  { label: 'English',        dir: 'ltr', font: 'latin'  },
  ar:  { label: 'العربية',         dir: 'rtl', font: 'arabic' },
  ckb: { label: 'کوردیی ناوەندی', dir: 'rtl', font: 'arabic' }, // Sorani Kurdish
  kmr: { label: 'Kurdî',          dir: 'ltr', font: 'latin'  }, // Kurmanji Kurdish
} as const;
```
Adding a fifth language later — RTL or LTR, any script — is one more entry in this object plus a folder of message files. Nothing else in the app references "Arabic" or "Kurdish" by name; it only ever reads `dir` and `font` off the active locale.

### Approach
- **Library:** `next-intl`, built for the App Router and Server Components, with first-class RTL support.
- **Routing:** locale-prefixed routes via middleware, e.g. `/en/jobs`, `/ar/jobs`, `/ckb/jobs`. Standard, SEO-friendly pattern; each language gets a real bookmarkable/shareable URL.
- **Direction handling:** the root layout reads the active locale's `dir` and sets it on the `<html>` tag: `<html lang={locale} dir={locales[locale].dir}>`. This single attribute flips native browser behavior (text alignment, scrollbar side) for free — the remaining work is making your own CSS direction-aware rather than hardcoded to left/right.
- **CSS — use logical properties, not physical ones:** throughout the codebase, use Tailwind's logical spacing/alignment utilities (`ms-4`/`me-4` for margin-start/end, `ps-4`/`pe-4` for padding-start/end, `text-start`/`text-end`, `start-0`/`end-0`) instead of `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`. Logical properties automatically flip in RTL contexts; physical ones don't. This is the single biggest source of "broken in Arabic" bugs if skipped, so it's worth enforcing via an ESLint rule (`eslint-plugin-tailwindcss` can flag physical-direction classes) from Phase 1 rather than fixing it retroactively across the whole app.
- **Components needing explicit mirroring:** back/forward chevrons, the search-filter drawer's slide-in direction, the map's floating filter panel position, and the bottom sheet's drag handle — these use icons or transforms that don't auto-flip with `dir` and need a small `rtl:` Tailwind variant or a `flip-icon` wrapper. The map itself (Mapbox canvas) does **not** mirror — only the UI chrome around it does.
- **Fonts:** Arabic script (covers both Arabic and Sorani Kurdish) needs a font with full Arabic glyph coverage — **Noto Sans Arabic** or **IBM Plex Sans Arabic** are solid, free choices. Latin script (English, Kurmanji Kurdish) can stay on your existing font (e.g. Inter). Load fonts conditionally per active locale via `next/font` so users aren't downloading an Arabic font subset on an English page.
- **Message files:** one JSON file per locale per namespace, e.g.:
  ```
  /messages/en/common.json,  job-search.json,  worker-profile.json
  /messages/ar/common.json,  job-search.json,  worker-profile.json
  /messages/ckb/common.json, job-search.json,  worker-profile.json
  /messages/kmr/... (added when/if Kurmanji content is ready)
  ```
  Every piece of UI copy (buttons, labels, form fields, validation messages, empty states) is a key in these files — never hardcoded strings in components.
- **Switching UX:** a language switcher in the header updates the locale segment of the URL and sets a `NEXT_LOCALE` cookie so the choice persists across sessions without needing login. Because `next-intl` resolves messages server-side per request and direction is set on `<html>` at render time, switching language (including LTR↔RTL) doesn't require a full client-side re-fetch of app logic — just a route change.
- **Scope — UI text only, not user content:** job descriptions, worker bios, and other user-submitted text are stored and displayed as entered, in whatever language the user wrote them — this is a UI-chrome translation system, not a content-translation system. A worker who writes their bio in Arabic will have it display in Arabic (and right-aligned, since that's their input) regardless of what locale the *viewer* has selected.
- **Pluralization:** ICU message format (built into `next-intl`) handles count-dependent phrasing per-locale correctly, which matters more for Arabic than English — Arabic has distinct plural forms (zero/one/two/few/many/other) that `next-intl`'s ICU support handles natively; literal string concatenation would not.
- **Fallback:** if a key is missing in a non-English locale, fall back to English rather than showing a raw key — configure this in `next-intl`'s config so partial translations never break the UI.

### Why this needs to be decided in Phase 1, not retrofitted
Locale-prefixed routing and `dir`-aware layout changes the app's folder structure and CSS conventions from the ground up. Retrofitting RTL support after building dozens of LTR-assumption pages (physical margins, unmirrored icons) is a much larger job than building it in from the start — see Phase 1 in Section 11. Include at least one RTL locale (Arabic, since it's launching regardless of the Kurdish-variant decision) in early QA passes so layout bugs surface immediately rather than right before launch.

---

## 7. Map & Geolocation Implementation Notes

- **Library:** Mapbox GL JS with `react-map-gl` bindings — free tier covers ~50k map loads/month, generous for early stage
- **Clustering:** Mapbox's built-in `cluster: true` on the GeoJSON source
- **UK postcode input:** Use a postcode-specific autocomplete (Ideal Postcodes / getAddress.io) rather than generic address autocomplete — far more accurate for UK addresses and postcode-only searches (e.g. "SW1A 1AA" or "Leeds LS1")
- **Radius search UX:** Slider or preset chips (1mi / 5mi / 10mi / 25mi / Nationwide) centered on the searched postcode/city
- **Mobile map pattern:** Full-screen map with a draggable bottom sheet for results/marker details (standard pattern, e.g. Airbnb/Zoopla) rather than a split map+list layout, which doesn't work well on small screens
- **Desktop pattern:** Split view — filterable list on the left, map on the right, synced hover/click states

---

## 8. Mobile Optimization & Capacitor Strategy

- **Mobile-first Tailwind breakpoints**, test at 375px width minimum
- **Touch targets:** minimum 44x44px, applies to marker taps and filter chips
- **Bottom sheet component:** shared between job search and employee search result views
- Capacitor plugins needed:
  - `@capacitor/geolocation` — "jobs near me" quick search
  - `@capacitor/camera` — profile photo, certificate/CV capture
  - `@capacitor/push-notifications` + Firebase Cloud Messaging — new contact alerts
  - `@capacitor/filesystem` — CV/certificate uploads on native
  - `@capacitor/app` — deep linking (e.g. push notification opens specific job)
- **App store prep:** privacy policy required (you're handling location + contact data), permission usage strings for camera/location, UK company details for store listings

---

## 9. Security, Privacy & Compliance

- **UK GDPR / Data Protection Act 2018** applies — you're processing location data and personal contact info
- Explicit consent for location use; clear data retention policy (e.g. auto-hide worker profiles after N months of inactivity)
- **Right to erasure:** account deletion must cascade properly through profiles, experience, qualifications, and contact logs (the `ON DELETE CASCADE` foreign keys in Section 4 handle this at the DB level — confirm application-level file deletion (S3/R2 objects) is triggered too, since cascading FK deletes won't remove uploaded files)
- Passwords hashed with bcrypt or argon2; sessions via Auth.js
- Sanitize all user-submitted text before rendering (job descriptions, bios) — standard XSS hygiene
- HTTPS everywhere, CSP headers, file upload validation (type/size limits)

---

## 10. Suggested Folder Structure

```
/app
  /[locale]
    /(auth)/sign-in, /sign-up
    /(onboarding)/worker-setup, /employer-setup
    /(dashboard)/worker/profile
    /(dashboard)/employer/jobs, /employer/jobs/[id]/edit
    /jobs                    -- job search (map)
    /jobs/[id]                -- full JD
    /workers                  -- employee search (map)
    /workers/[id]              -- full worker profile
    /billing
/app/api
  /auth/[...nextauth]
  /jobs
  /workers
  /skills
  /webhooks/stripe
/components
  /map                      -- shared map, marker, cluster, bottom-sheet components
  /profile
  /job
  /ui                        -- shared primitives
/lib
  /db
    /pool.ts                  -- mysql2 pool
    /repositories             -- jobs.ts, workers.ts, users.ts, skills.ts, contacts.ts
    /types.ts
    /migrations                -- versioned .sql files
  /auth
  /stripe
  /geocoding
  /entitlements.ts             -- tier-gating logic (Section 2)
/messages
  /en/common.json, job-search.json, worker-profile.json, ...
  /pl/... (etc, added as new languages come in)
/capacitor.config.ts
```

---

## 11. Phased Build Plan

**Phase 1 — Foundations (incl. i18n + RTL scaffolding)**
Auth, `[locale]` routing structure, next-intl setup, and `dir`-aware layout/logical-CSS conventions from day one (build at least the English + Arabic locales together so RTL is validated early, not bolted on), database schema + migrations, custom data access repositories, worker profile CRUD, employer profile CRUD, basic job CRUD (no map yet).

**Phase 2 — Search & Map**
Mapbox integration, job search with filters + map, employee search with filters + map, marker clustering, bottom sheet / detail views, spatial queries in MySQL.

**Phase 3 — Subscriptions**
Stripe integration, tier gating (`entitlements.ts`), contact-info reveal gating, billing portal, upgrade/downgrade flows.

**Phase 4 — Mobile Packaging**
Capacitor setup pointing at live deployment, native plugin integration (geolocation, camera, push), app store prep and submission.

**Phase 5 — Polish**
Notifications, saved searches, admin/moderation tools, analytics, additional language rollout.

---

## 12. Environment Variables / Third-Party Services Checklist

```
DATABASE_URL=
DB_HOST= / DB_USER= / DB_PASSWORD= / DB_NAME=   # for mysql2 pool config
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MAPBOX_ACCESS_TOKEN=
IDEAL_POSTCODES_API_KEY=        # or getAddress.io key
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_BASIC=
STRIPE_PRICE_ID_ADVANCED=
S3_BUCKET_NAME= / R2_BUCKET_NAME=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
RESEND_API_KEY=                  # or Postmark
FIREBASE_SERVER_KEY=              # for push notifications
```

---

## 13. Resolved: Launch Languages

English, Arabic, and Kurdish are confirmed for launch. Since the Kurdish variant (Sorani vs Kurmanji) wasn't pinned down, the locale system (Section 6) treats direction and script as configurable per-locale rather than assumed — so `ckb` (Sorani) and `kmr` (Kurmanji) can each be added independently whenever their translation files are ready, without touching app logic. No remaining open questions on this front; the only outstanding task is sourcing translated copy for whichever Kurdish variant(s) you decide to ship first.

---

### How to use this with Cursor
Paste this whole document in as project context (e.g. drop it in as `PROJECT_SPEC.md` at the repo root and reference it in your first prompt), then work through Phase 1 task by task rather than asking Cursor to scaffold everything at once — this keeps generated code reviewable and keeps the AI from making silent architectural decisions that conflict with the spec above.
