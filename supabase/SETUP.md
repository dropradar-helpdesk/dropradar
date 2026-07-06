# DropRadar Supabase Setup

This is the practical setup path for a first shared-request beta.

Do not put real Supabase secret keys, service_role keys, DB passwords, or legacy admin tokens in git. `data/app-config.json` is intentionally ignored.

## 1. Create Project

1. Open Supabase and create a new project.
2. Keep the project region close to Japan if the first users are Japan-based.
3. From Integrations > Data API, copy the base project URL:
   - `https://YOUR_PROJECT_ID.supabase.co`
   - If the UI shows `/rest/v1/`, remove that suffix for `data/app-config.json`.
4. From Project Settings > API Keys, copy:
   - Publishable key
   - Older Supabase screens may call this the anon public key.

## 2. Apply Database

In Supabase SQL Editor:

1. Open `supabase/schema.sql`.
2. Paste and run it.
3. Open `supabase/seed.sql`.
4. Review it, then paste and run it.
5. Run `npm run sources:sql`.
6. Open `supabase/official-sources.generated.sql`.
7. Review it, then paste and run it.

The schema creates:

- public read tables: `drops`, `official_sources`, `spot_locations`
- shared request view: `tracking_request_feed`
- request RPCs: `submit_tracking_request`, `vote_tracking_request`
- admin RPC: `admin_set_tracking_request`
- admin logs: `admin_decisions`, `moderation_notes`

User GPS is not part of the schema. Only public destination coordinates live in `spot_locations`.

If the database already exists and you only need the official monitoring v1 fields, run:

```text
supabase/monitoring-v1-migration.sql
```

If the Edge Function health check passes but dry-run reports a permission error,
run:

```text
supabase/service-role-grants.sql
```

## 3. Configure Local App

Copy:

```text
data/app-config.sample.json
```

to:

```text
data/app-config.json
```

Set:

```json
{
  "features": {
    "supabase": true,
    "remoteReads": true,
    "remoteWrites": true,
    "remoteAdminWrites": true
  },
  "supabase": {
    "url": "https://YOUR_PROJECT_ID.supabase.co",
    "anonKey": "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
    "adminAccessToken": ""
  }
}
```

`remoteAdminWrites: true` is safe only because admin RPCs still require a Supabase Auth JWT whose `app_metadata.role` is `admin`. Keep `adminAccessToken` empty in normal app use.

## 4. Smoke Test Public Requests

From the project folder:

```powershell
npm run supabase:smoke
```

This checks read access only.

Then run one write test:

```powershell
npm run supabase:smoke:write
```

This submits a test tracking request and casts one candidate vote through RPC. It should appear in `tracking_request_feed`.

## 5. Admin Login

For app-side admin login:

1. Create a Supabase Auth user for yourself.
2. Set that user as admin.
3. Copy `supabase/admin-role-template.sql`.
4. Replace `YOUR_ADMIN_EMAIL@example.com`.
5. Run it in SQL Editor.
6. Open the app, tap `管理`, and sign in with that Auth user.
7. The app stores only the JWT session on the device. It does not store the password.

For the current helpdesk account, `supabase/admin-role-dropradar-helpdesk.sql` is already prepared. Run it after the Auth user exists.

For legacy local smoke testing only, you may still provide a short-lived admin user access token in `data/app-config.json` as `supabase.adminAccessToken`, then run:

```powershell
npm run supabase:smoke:admin
```

Never deploy a public static build with `adminAccessToken` included. Normal admin use should go through Supabase Auth login; an Edge Function that checks the logged-in admin is the next hardening step.

## 6. App Check

Open:

```text
http://127.0.0.1:8765/
```

In admin mode:

- Production connection should show Supabase configured.
- Request storage should show DB read/write when remote flags are enabled.
- Admin save should show DB only when `remoteAdminWrites` is enabled and the app is signed in as an Auth user with `app_metadata.role = admin`.

## 7. First Beta Rule

Keep personal favorites, budgets, plans, and GPS local for now.

Only share:

- public cards
- official sources
- tracking requests
- request votes
- intake/admin review data

That keeps the beta useful without collecting unnecessary personal data.

## 8. Deploy Official Monitor Function

The first production monitor is:

```text
supabase/functions/ingest-official-sources/index.ts
```

It writes only to `source_checks`, `ingest_runs`, and `intake_candidates`.
It never publishes public drops directly.

The local PC currently needs the Supabase CLI before deployment. After installing
and logging in to the CLI, run from the project folder:

```powershell
supabase functions deploy ingest-official-sources --project-ref YOUR_PROJECT_ID
```

For this project, the project ref is:

```text
frpadphgdzdakxytedqy
```

Set an invoke secret before any scheduled run. Do not write it to git:

```powershell
supabase secrets set INGEST_CRON_SECRET=YOUR_LONG_RANDOM_SECRET --project-ref frpadphgdzdakxytedqy
```

Supabase should provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge
Functions. If the health check reports the service role key as missing, set it
from the Supabase dashboard or CLI secrets without committing it to files.

After deploy, run:

```powershell
npm run function:smoke
```

If `INGEST_CRON_SECRET` is set, provide it only as an environment variable:

```powershell
$env:DROPRADAR_INGEST_SECRET="YOUR_LONG_RANDOM_SECRET"
npm run function:smoke
```

The smoke command first calls `GET /functions/v1/ingest-official-sources` to
check environment presence, then calls `POST` with `dryRun=true`. Dry run creates
an `ingest_runs` row but does not write `source_checks` or `intake_candidates`.

Only after dry-run is clean, use:

```powershell
npm run function:smoke:write
```

Then review `source_checks` and `intake_candidates` from the admin app before
approving anything public.

## 9. Schedule Official Monitor

The recommended low-maintenance pattern for the free beta is GitHub Actions
calling the Supabase Edge Function once per day.

Use:

```text
.github/workflows/dropradar-daily-ingest.yml
```

The schedule is:

```text
17 22 * * *
```

That is 07:17 JST daily. It is intentionally once per day because DropRadar is a
missed-update guard, not a fastest-news crawler.

Add these repository secrets in GitHub:

```text
DROPRADAR_SUPABASE_URL
DROPRADAR_SUPABASE_ANON_KEY
DROPRADAR_INGEST_SECRET
```

`.env.github-actions.example` contains the names only. Keep real values in
GitHub Secrets, not in git.

`DROPRADAR_INGEST_SECRET` must match the Edge Function's `INGEST_CRON_SECRET`.
Do not put the Supabase service-role key in GitHub. The service-role key should
stay inside Supabase Edge Function secrets.

Before pushing or enabling the schedule, run:

```powershell
npm run monitor:plan -- --tier=high --limit=8
npm run github:preflight
```

Before enabling the daily run, open the workflow manually and run it once with:

```text
dry_run=true
```

Then run it once with `dry_run=false` and review `ingest_runs`,
`source_checks`, and `intake_candidates`.

If you later want Supabase-only scheduling, use:

```text
supabase/schedule-ingest-cron-template.sql
```

That fallback template uses the same 07:17 JST daily cadence and the same
high-priority source IDs.
