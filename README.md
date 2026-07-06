# DropRadar

Official-announcement-first prototype for tracking hobby drops, limited goods, collaborations, new manga volumes, anime adaptations, events, and nearby side stops.

## Current Status

- Static smartphone-first HTML prototype.
- PWA-ready prototype with a web app manifest, local Service Worker cache, standalone display metadata, safe-area spacing, and original DropRadar icons.
- Favorite items can be saved locally and reviewed in a My Page view.
- My Page includes user-set S/A/B/C ranks, recovery dates, 500-yen-step per-content budgets, an editable monthly cap, progress statuses, date-grouped schedule planning, and current-month budget subtraction based on recovery dates.
- My Page also surfaces "today", "due tomorrow", and "this week" action cards from saved items.
- My Page action cards now also flag deadline watch, `tier S` unchecked items, upcoming releases, and monthly budget pressure.
- Zero-result searches can be saved as visible tracking requests under search, voted on as candidate/problem signals, cleaned up with hide/delete/merge controls, annotated with admin notes and official URLs, and finally reviewed by admin status as pending, candidate, or rejected.
- Approved tracking requests can be opened as official-card drafts, saved locally, and published as preview cards in the main feed once an official URL is attached.
- Official-source diffs and risky requests now have an auto-intake queue: generated local candidates, low-risk official candidates, human-review items, and quarantined adult/unsafe requests are separated before anything becomes public.
- Prototype admin mode now has a cross-source admin review board that combines official diffs and tracking requests, then lets the operator mark each item as candidate, hold, rejected, or quarantine with local review notes before publishing.
- Official watch sources have been expanded into 26 Supabase-ready official groups, with Bandai/Gunpla/Ichiban Kuji/prize/Tamashii/Gashapon/namco/GiGO/Taito/Sega/Square Enix/Sanrio/Frieren/Initial D split into separate lanes instead of one broad hobby crawler.
- Official monitoring now has a generated source plan at `data/source-checks/monitor-plan.json`, so the operator can run high-priority daily batches without crawling every source every time.
- Public mode shows only request browsing, candidate/problem voting, and official search links; prototype admin mode exposes cleanup, merging, notes, official URLs, and card publishing.
- Admin mode now includes a Supabase-shaped storage blueprint, production connection status, sync queue counts, row-level access, request review flow, official-source checks, user favorites, schedules, and budgets.
- The Supabase draft now has a loginless shared request basis: `submit_tracking_request`, `vote_tracking_request`, `tracking_request_feed`, hidden raw vote rows, hidden anonymous fingerprints, admin-only adoption / rejection / quarantine, and explicit no-GPS-storage boundaries.
- The local request UI is now wired behind feature flags: with Supabase config plus `remoteReads` / `remoteWrites`, it can read `tracking_request_feed` and write through `submit_tracking_request` / `vote_tracking_request`. Without config, it falls back to on-device storage.
- Public cards now read from Supabase `drops` first when `remoteReads` is enabled, with `data/drops.json` kept as the local fallback. Generate the reviewed SQL with `npm run drops:sql`.
- Admin request actions now use Supabase Auth: the admin button opens a login dialog, stores only the short-lived JWT session on the device, and calls `admin_set_tracking_request` only when the logged-in user has `app_metadata.role = admin`.
- Doujin-event planning is parked as a future/internal lane and is not shown in the current public-facing prototype.
- Hunt-day premise chips now change the suggested route, stop count, alerts, transit priority, and over-chase prevention notes.
- Nearby support can request GPS only after the user taps the button, sort pilgrimage / detour / local-collab spots by approximate distance, and open Google Maps or Apple Maps with the destination.
- GPS is optional. If refused, the main app still works; only current-location sorting is unavailable. DropRadar does not misuse, store, or share user location, and route buttons pass only the destination to external map apps.
- Contact and rights-holder takedown requests are routed to `dropradar.helpdesk@gmail.com`; the Gmail inbox has been created and verified.
- No copyrighted product images, official logos, manga panels, anime stills, PV screenshots, or fake official-looking images.
- Drop/card data is managed in `data/drops.json`.
- Contact settings are managed in `data/contact.json`.
- Source registry seed data is managed in `data/source-registry.json`.
- Storage planning data is managed in `data/storage-blueprint.json`.
- Optional local production config is copied from `data/app-config.sample.json` to ignored `data/app-config.json`.
- Generated intake candidates are managed in `data/intake-candidates.generated.json`.
- Robots audit output is managed in `data/source-audits/robots-audit.json`.
- Source enablement decisions are recorded in `data/source-audits/source-enablement-decisions.json`.
- Bandai-heavy lanes are intentionally split in `data/source-registry.json` so one risky or noisy source can be paused without disabling Gunpla, Ichiban Kuji, Gashapon, prize, or arcade campaigns together.
- MANGA Plus is excluded from the initial Shueisha watch URLs because the Supabase dry run hit DNS lookup failure; add it later as a separate source after a fresh audit.
- Supabase setup guide is in `supabase/SETUP.md`; schema draft is in `supabase/schema.sql`; initial seed data is in `supabase/seed.sql`; scheduled ingest skeleton is in `supabase/functions/ingest-official-sources/`.
- Edge Function service-role grants for existing projects are in `supabase/service-role-grants.sql`.
- Scheduled official-source monitoring is set up for GitHub Actions in `.github/workflows/dropradar-daily-ingest.yml`; the Supabase `pg_cron` template remains in `supabase/schedule-ingest-cron-template.sql` as a fallback.
- Public static deployment is set up for GitHub Pages in `.github/workflows/dropradar-pages.yml`.
- Public GitHub Pages config is generated at `data/app-config.public.json`; it contains only the Supabase URL and anon key, never service-role keys, admin JWTs, DB passwords, or ingest secrets.
- Public-card seed SQL is generated at `supabase/drops.generated.sql` from `data/drops.json`.
- Official-source seed SQL is generated at `supabase/official-sources.generated.sql` from `data/source-registry.json`.
- Supabase smoke tests are available through `npm run supabase:smoke`, `npm run supabase:smoke:write`, and `npm run supabase:smoke:admin`.
- Edge Function smoke tests are available through `npm run function:smoke` and `npm run function:smoke:write` after deploying `ingest-official-sources`.
- `spot_locations` is planned for public pilgrimage / detour / local-collab coordinates; user GPS location is intentionally not part of the storage model.
- PWA metadata is managed in `manifest.webmanifest`; offline shell caching is managed in `sw.js`.
- Manual official-source check scripts are in `tools/`.
- Account roles, non-secret IDs, GitHub/Supabase confusion points, and recovery steps are managed in `ops/account-runbook.md`. Passwords and private keys are intentionally not stored in the repo.

## How To Run

From this folder:

```powershell
.\start-local-server.ps1
```

Then open:

```text
http://127.0.0.1:8765/
```

You can also open `index.html` directly, but running the local server is closer to the future app shape.

## Smartphone / PWA Trial

Run the local server, then open `http://127.0.0.1:8765/` from a browser that can reach this PC or deploy the folder to HTTPS hosting.

- iPhone Safari: Share button -> Add to Home Screen.
- Android Chrome: Menu -> Add to Home screen or Install app.
- Local file opening will not register the Service Worker; use the local server or HTTPS.
- The Service Worker caches the app shell and local JSON only. Official external pages are linked, not cached.

## GitHub Pages

Build the public Supabase config from the ignored local config:

```powershell
npm run config:public
```

Then push to `main`. The Pages workflow publishes the static app to GitHub Pages and removes ignored local-only `data/app-config.json` from the artifact.

## Project Structure

```text
.
|-- index.html
|-- manifest.webmanifest
|-- sw.js
|-- offline.html
|-- icons/
|   |-- icon.svg
|   |-- maskable.svg
|   |-- icon-192.png
|   `-- icon-512.png
|-- data/
|   |-- drops.json
|   |-- contact.json
|   |-- app-config.sample.json
|   |-- app-config.public.json
|   |-- intake-candidates.generated.json
|   |-- source-registry.json
|   |-- source-checks/monitor-plan.json
|   `-- storage-blueprint.json
|-- .github/
|   `-- workflows/
|       |-- dropradar-daily-ingest.yml
|       `-- dropradar-pages.yml
|-- ops/
|   `-- account-runbook.md
|-- .env.github-actions.example
|-- supabase/
|   |-- SETUP.md
|   |-- schema.sql
|   |-- seed.sql
|   |-- admin-role-template.sql
|   `-- functions/
|       `-- ingest-official-sources/
|           `-- index.ts
|-- tools/
|   |-- check-pokemon-card-source.ps1
|   |-- check-bandai-hobby-source.ps1
|   |-- build-drops-seed.mjs
|   |-- build-intake-candidates.mjs
|   |-- build-public-app-config.mjs
|   |-- run-official-monitor.mjs
|   |-- sync-request-watchlist.mjs
|   |-- trigger-ingest-function.mjs
|   |-- check-github-actions-secrets.mjs
|   `-- supabase-smoke-test.mjs
|-- legal-and-accessibility-checklist.md
|-- package.json
|-- start-local-server.ps1
`-- README.md
```

## Official Source Check Test

Build the next monitor plan without fetching pages:

```powershell
npm run monitor:plan -- --tier=all
```

Preview the full monitor flow without fetching official pages:

```powershell
npm run monitor:dry -- --tier=all --from-sample
```

Run the daily priority batch from the project folder:

```powershell
npm run monitor:run -- --tier=all --from-sample
```

Run all selected monitor steps from the project folder:

```powershell
npm run monitor:run
```

For a light test run:

```powershell
npm run monitor:run -- --limit=1
```

For a local-only debug run that avoids Supabase request reads:

```powershell
npm run monitor:run -- --from-sample --limit=1
```

The monitor does three things:

1. Reads `tracking_request_feed` from Supabase and writes demand-gated terms to `data/request-watchlist.json`.
2. Checks official source pages from `data/source-registry.json` and writes diffs under `data/source-checks/`.
3. Builds `data/intake-candidates.generated.json` for the admin review queue.

The scripts fetch official product pages once and save local audit files:

```text
data/source-checks/pokemon-card-products.json
data/source-checks/bandai-spirits-products.json
```

They also compare the latest fetch with the previous saved result and write:

```text
data/source-checks/pokemon-card-products-diff.json
data/source-checks/bandai-spirits-products-diff.json
data/source-checks/history/
data/source-checks/last-monitor-run.json
```

The app reads the diff files and shows the latest official check time, link delta, and page-hash change in the source registry.

It also reads:

```text
data/intake-candidates.generated.json
```

That file is generated from source-check diffs and appears in the admin auto-intake queue. The old command is kept as an alias:

```powershell
npm run intake:local
```

This is still a controlled source-check test, not a blind crawler. Before scheduled crawling, confirm each official site's robots.txt, terms, rate limits, and allowed usage.

To audit robots.txt for one source group:

```powershell
npm run audit:robots -- --source=restaurant-chain-collabs
```

The output is written to:

```text
data/source-audits/robots-audit.json
```

For a free / low-maintenance run, scheduled checks should write only to an intake queue:

- Official-page changes become `intake_candidates` with `safe` or `review` risk.
- User requests with adult, explicit, illegal, personal-data, resale-solicitation, or image-rehosting risk become `block` / quarantine candidates.
- The public feed should be updated only after an admin approves a candidate with an official URL.
- X/social chatter should be optional and later; do not make it the core free pipeline.

## Supabase Production Skeleton

The app still works without Supabase. To test a real backend:

1. Follow `supabase/SETUP.md`.
2. Create a Supabase project.
3. Run `supabase/schema.sql`, then review and run `supabase/seed.sql`.
4. Run `npm run drops:sql`, then review and run `supabase/drops.generated.sql`.
5. Run `npm run sources:sql`, then review and run `supabase/official-sources.generated.sql`.
6. Create an admin user and set their JWT app metadata role to `admin`.
7. Copy `data/app-config.sample.json` to `data/app-config.json`.
8. Set `features.supabase` to `true`, then add your Supabase URL and anon key.
9. Run `npm run supabase:smoke` to confirm read access to official sources, published drops, and the request feed.
10. For shared request testing, set `features.remoteReads` and `features.remoteWrites` to `true`, then run `npm run supabase:smoke:write`.
11. Set `features.remoteAdminWrites` to `true`, open the app, tap `管理`, and sign in with the Supabase Auth admin user. The app should show admin save as DB only after a valid admin login.
12. `npm run supabase:smoke:admin` is still available for local fallback testing with a short-lived `supabase.adminAccessToken`, but do not use that path for public builds.

`data/app-config.json` is ignored by git because it can contain real project keys.

Do not deploy a public static build with `supabase.adminAccessToken` inside `data/app-config.json`. Normal admin use should go through Supabase Auth login and `app_metadata.role = admin`; a server-side Edge Function is still safer for later production hardening.

### Loginless Shared Requests

The public client should not write directly to `tracking_requests` or `request_votes`.

- Unlisted searches call `submit_tracking_request(term, deviceKey)`.
- Duplicate terms are normalized and merged in `tracking_requests`.
- Search demand is counted once per signed-in user or anonymous device fingerprint in `request_search_signals`.
- Candidate / problem votes call `vote_tracking_request(requestId, voteType, deviceKey)`.
- Votes are limited to one per signed-in user or anonymous device fingerprint in `request_votes`.
- Public screens read `tracking_request_feed`, which exposes only term, status, official URL, search count, candidate votes, problem votes, and dates.
- Raw vote rows, anonymous hashes, admin notes, moderation notes, and decision logs stay admin-only.
- Admin actions use `admin_set_tracking_request(...)` or admin-authenticated table access, then write `admin_decisions` and `moderation_notes`.
- The device key is generated locally and used only for duplicate prevention. The database stores the hashed value, not the raw local key.
- Local/staging admin actions can approve, reject, hide, restore, merge existing remote requests, and update official URL / admin notes through `admin_set_tracking_request`.

For the first public test, keep personal favorites, budgets, and plans on-device. Move them to `user_favorites`, `user_plans`, and `budget_envelopes` only after login is added.

### Smoke Test Commands

Read-only check:

```powershell
npm run supabase:smoke
```

One request + one candidate vote:

```powershell
npm run supabase:smoke:write
```

Legacy admin RPC check:

```powershell
npm run supabase:smoke:admin
```

The write tests create a small smoke tracking request. The legacy admin test hides/rejects its own smoke request afterward.

The Edge Function skeleton is:

```text
supabase/functions/ingest-official-sources/index.ts
```

It is designed to:

- read `official_sources`,
- read multiple `watch_urls` and `discovery_keywords`,
- skip sources until `robots_checked_at` is filled,
- fetch official pages,
- store hashes, candidate links, page results, and fetch errors in `source_checks`,
- write run history to `ingest_runs`,
- create only `intake_candidates`, never public `drops`,
- require admin review before anything becomes public.

For an existing Supabase project, run this before deploying the v1 ingest function:

```text
supabase/monitoring-v1-migration.sql
```

After deploying the function, verify it without publishing public cards:

```powershell
npm run function:smoke
```

If the function has `INGEST_CRON_SECRET`, set it only in the shell before running
the smoke test:

```powershell
$env:DROPRADAR_INGEST_SECRET="YOUR_LONG_RANDOM_SECRET"
npm run function:smoke
```

The smoke test calls the function health endpoint first, then runs a dry-run
official-source check. Use `npm run function:smoke:write` only after the dry-run
is clean.

For hands-off monitoring, the first-choice path is GitHub Actions:

```text
.github/workflows/dropradar-daily-ingest.yml
```

It runs once per day at `17 22 * * *`, which is 07:17 JST, builds the
daily official-source plan for all automation-ready source groups, and calls the Supabase Edge Function with
`dryRun=false`. It writes only to `source_checks`, `ingest_runs`, and
`intake_candidates`; public drops still require admin review.

Each run also writes a human-readable GitHub Actions step summary and uploads
`artifacts/ingest-report.json` as the `dropradar-ingest-report` artifact. The
workflow fails only for hard operational failures such as no sources checked or
all sources failing/skipping. Partial source failures and source IDs that were
planned locally but missing from Supabase `official_sources` are surfaced as
warnings, so one official site outage or seed gap does not hide in a green run.

In the app, admin mode reads the latest `ingest_runs` row and shows it in the
production connection panel as `Daily ingest`. The official-source panel also
shows ingest health by source: DB registration, last check, link delta, and
planned-but-unchecked gaps. This is the quick check before opening GitHub
Actions or Supabase.

Add these GitHub repository secrets before enabling the schedule:

```text
DROPRADAR_SUPABASE_URL
DROPRADAR_SUPABASE_ANON_KEY
DROPRADAR_INGEST_SECRET
```

`.env.github-actions.example` lists the same names for copying into GitHub
Secrets. Do not put real values in that file.

The service-role key stays inside Supabase Edge Function secrets and should not
be stored in GitHub.

Before pushing, check the workflow and source plan:

```powershell
npm run monitor:plan -- --tier=all
npm run github:preflight
```

Manual test from GitHub Actions can be run with `dry_run=true`. Local trigger
testing is also available:

```powershell
$env:DROPRADAR_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
$env:DROPRADAR_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
$env:DROPRADAR_INGEST_SECRET="YOUR_LONG_RANDOM_SECRET"
npm run monitor:plan -- --tier=all
npm run function:trigger:dry
```

`supabase/schedule-ingest-cron-template.sql` is kept as a Supabase-only fallback
and uses the same once-daily 07:17 JST cadence.

User GPS is not part of this backend model. Only public destination coordinates live in `spot_locations`.

## Product Direction

Core value:

- New releases, limited goods, collabs, lotteries, purchase limits, official store links, deadlines, and events in one mobile-first feed.
- Turn broad official-source information into a personal plan: favorites, user-set priority, schedule, per-content budgets, transit/food costs, and spending envelopes.

Primary audience:

- Niche hobby/otaku users who already chase this information across many official pages.

Secondary audience:

- General fans and inbound travelers who want to know what is currently worth checking in Japan.

Sub value:

- Nearby pilgrimage spots, local collabs, manholes, route notes, and solo-first over-chase prevention.
- Current-location support should remain optional and secondary: no GPS gate for browsing, no location history, no third-party sharing, and no promise that a route or transit choice will succeed.

## Legal / Operation Guardrails

- Treat this as an unofficial information organizer.
- Store facts and short original summaries.
- Link users to official pages for images, details, stock, tickets, and final purchase conditions.
- Separate official facts, store-specific notices, and user reports.
- Do not claim stock guarantees.
- Make the user-facing disclaimer visible: DropRadar monitors sources but may miss, delay, or fail to reflect changes; users are responsible for final official checks, purchase / lottery actions, travel decisions, and their own fan-activity management.
- Do not imply responsibility for failed purchases, missed entries, schedule changes, transportation costs, purchase costs, or related losses.
- Treat GPS as an optional subfeature. Refusal must not block the core app; user location must not be stored, sold, shared, or used outside temporary nearby sorting and user-initiated map handoff.
- Keep the public contact route visible: `dropradar.helpdesk@gmail.com` for contact, correction, and rights-holder takedown requests.
- See `legal.html` for the public policy/contact draft, and `legal-and-accessibility-checklist.md` before adding crawlers, user reports, ads, or monetization.

## Next Build Steps

1. Create the actual Supabase Auth admin user, apply `app_metadata.role = admin`, and verify admin login from the app.
2. Review robots.txt / terms for the v1 official source list, then fill `robots_checked_at` only for allowed sources.
3. Install/login to Supabase CLI, deploy `supabase/functions/ingest-official-sources`, set `INGEST_CRON_SECRET`, then run `npm run function:smoke`.
4. Add GitHub repository secrets, run `.github/workflows/dropradar-daily-ingest.yml` manually once with `dry_run=true`, then enable the daily schedule.
5. Connect spot locations to Supabase reads.
6. Keep periodic inbox checks for `dropradar.helpdesk@gmail.com`, especially after launch and after source/collab updates.
7. Review `legal.html` with a lawyer before App Store / broad public release, then prepare store screenshots and privacy metadata.
