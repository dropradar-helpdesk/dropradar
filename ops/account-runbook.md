# DropRadar Account And Operations Runbook

This file is the account / secret map for DropRadar operations.

It intentionally does not store passwords, access tokens, service-role keys, or
personal recovery answers. Those belong in the owner's password manager or the
provider's own secret store.

## Current Non-Secret IDs

| Item | Value | Used for |
| --- | --- | --- |
| Contact / admin mailbox | dropradar.helpdesk@gmail.com | Contact, takedown requests, service signups |
| Supabase project ref | frpadphgdzdakxytedqy | CLI linking and dashboard project ID |
| Supabase project URL | https://frpadphgdzdakxytedqy.supabase.co | App API URL and Edge Function calls |
| GitHub repository | https://github.com/dropradar-helpdesk/dropradar | Source control and GitHub Actions |
| GitHub Pages URL | https://dropradar-helpdesk.github.io/dropradar/ | Public PWA/web prototype after Pages deploy |
| Local project folder | `outputs/hobby-drop-app` | Main app source |
| Local app URL | http://127.0.0.1:8765/ | Prototype browser check |

## Account Roles

| Account / credential | What it is | Where it is used | Do not confuse with |
| --- | --- | --- | --- |
| Gmail / Google account | The owner mailbox account | Gmail inbox, possible GitHub "Continue with Google" login | Supabase DB password |
| Supabase dashboard account | Supabase owner login | Supabase web dashboard | GitHub login, DB password |
| Supabase DB password | Database-level password | Database connection / reset only | Supabase dashboard login, GitHub login |
| Supabase anon key | Public app key | `data/app-config.json`, GitHub Actions secret | Service-role key |
| Supabase service-role key | Private backend/admin key | Supabase Edge Function server side only | Browser app, GitHub public files |
| Supabase CLI access token | Temporary deploy credential | Local CLI deploys | GitHub login, DB password |
| GitHub account | Code repository owner account | GitHub repo and GitHub Actions | Supabase account |
| GitHub Actions secrets | Repo-side runtime secrets | Daily ingest workflow | Files committed to git |
| Local SSH deploy key | Private key in `work/secrets/dropradar_github_rsa` and public key in GitHub SSH keys | Local git push from this PC/thread | GitHub Actions secrets |
| Public app config | `data/app-config.public.json` | GitHub Pages Supabase anon connection | Local `data/app-config.json`, service-role key, ingest secret |

## What To Use On The Current GitHub Screen

If the browser shows GitHub login or signup:

- Use the GitHub account.
- If no GitHub account exists yet, the easiest path is `Continue with Google`
  using `dropradar.helpdesk@gmail.com`.
- Do not enter the Supabase DB password here.
- Do not enter the Supabase CLI token here.
- Do not enter the Supabase service-role key here.

## Local Secret Files

These files are local-only and must not be committed:

| File | Purpose |
| --- | --- |
| `.env.github-actions.local` | Local copy of values that will be pasted into GitHub Actions secrets |
| `data/app-config.json` | Local Supabase URL / anon-key config for app testing |
| `supabase/.temp/` | Supabase CLI project metadata |

The `.gitignore` is set to exclude them.

## GitHub Actions Secrets To Set

When the GitHub repository exists, add these repository secrets from the local
ignored `.env.github-actions.local` file:

| GitHub secret | Purpose |
| --- | --- |
| `DROPRADAR_SUPABASE_URL` | Supabase project URL |
| `DROPRADAR_SUPABASE_ANON_KEY` | Supabase public anon key |
| `DROPRADAR_INGEST_SECRET` | Shared secret for the Edge Function ingest endpoint |

Check before running the workflow:

```powershell
npm run github:preflight
```

## Current Backend State

- Supabase project is created and linked.
- Edge Function `ingest-official-sources` is deployed.
- Ingest secret is set in Supabase secrets.
- Dry-run and write smoke tests passed.
- Daily GitHub Actions workflow is prepared for one run per day at 07:17 JST.
- Local git repository exists and has an initial commit.
- GitHub repository `dropradar-helpdesk/dropradar` is created.
- Local `main` is pushed to GitHub over SSH.
- GitHub Actions secrets are registered.
- GitHub Actions manual dry-run succeeded.
- GitHub Actions manual write-mode run succeeded.
- GitHub Pages workflow is configured.
- Public config for GitHub Pages is generated with only Supabase URL and anon key.
- GitHub Pages manual deployment succeeded.
- Public app opened successfully at `https://dropradar-helpdesk.github.io/dropradar/`.

## Next GitHub Procedure

1. Keep the repository at `https://github.com/dropradar-helpdesk/dropradar`.
2. Use SSH remote `git@github.com:dropradar-helpdesk/dropradar.git` for local pushes.
3. Leave the daily GitHub Actions schedule enabled.
4. Check the GitHub Pages deployment after the next push.
5. Check the ingest workflow after the next scheduled 07:17 JST run.
   - First look at the Actions step summary.
   - Download `dropradar-ingest-report` only when the run is red, warning-heavy,
     or candidate counts look unusual.
   - In the app, admin mode shows the latest `Daily ingest` status from
     `ingest_runs`; use that as the quick daily glance.
   - In the app, open `追跡・回収メモ` and check `巡回ヘルス` for DB未登録,
     未巡回, and link deltas before manually hunting through GitHub logs.
6. After no more local Supabase CLI deploy work is needed, revoke the temporary Supabase CLI access token.

## Reset / Recovery Rules

- If the GitHub password is unknown, reset it from GitHub or use Google login.
- If the Supabase dashboard password is unknown, reset it from Supabase login.
- If the Supabase DB password is uncertain, reset it in the Supabase dashboard
  before production use.
- If `DROPRADAR_INGEST_SECRET` is lost, generate a new one, update Supabase
  Function secrets, then update GitHub Actions secrets.
- If a service-role key is exposed, rotate it immediately from Supabase.
- If a public config ever includes service-role keys, admin JWTs, DB passwords,
  or ingest secrets, remove it from git history and rotate the leaked value.
- If the local SSH private key is exposed, delete `DropRadar local deploy key`
  from GitHub SSH keys, generate a new key, and update the local git push setup.

## Operating Boundary

Codex can manage code, documentation, setup steps, checks, schema, workflows,
and non-secret operational state in this project.

The owner must keep actual passwords and recovery methods outside the repo,
preferably in a password manager or the browser's saved-password vault.

## Release Ownership

DropRadar's main value is not that each individual listing is precious. The
value is that official announcements, requests, schedules, budgets, and nearby
ideas are gathered into one view.

Therefore the normal release loop is:

1. Codex runs `npm run release:qa` or `node tools/release-qa.mjs`.
2. Codex fixes any release-blocking copy, JSON, script, contact, PWA, or public
   secret issue found by the QA gate.
3. Codex commits, pushes, and checks the GitHub Pages workflow.
4. Codex opens the public app URL and verifies the basic rendered state.
5. The owner gives product-direction corrections afterward when something feels
   wrong.

Do not require the owner to manually inspect every card, source, or workflow
before each public preview. If a non-critical listing is wrong, ship the safer
preview and correct it after owner feedback.

## Daily Codex Review Automation

Codex app automation `dropradar-daily-request-review` is active.

- Schedule: daily at 07:45 JST, after the 07:17 JST official ingest window.
- Working folder: `outputs/hobby-drop-app`.
- Owner expectation: Codex reviews accumulated tracking requests, intake
  candidates, release QA, GitHub Pages status, and public app rendering.
- Owner involvement: emergency response only, such as legal risk, adult/unsafe
  requests, credential failure, public breakage, or irreversible admin action.
- Normal corrections can happen after publishing when the owner notices product
  direction issues.

This automation should not expose secrets or require the owner to inspect every
card. If admin credentials are unavailable, Codex should leave a concise report
and concrete next action instead of blocking the owner with broad manual review.
