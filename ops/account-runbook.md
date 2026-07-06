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
- GitHub repository creation is pending GitHub login / account setup.

## Next GitHub Procedure

1. Sign in to GitHub, preferably with Google using `dropradar.helpdesk@gmail.com`.
2. Create repository `dropradar`.
3. Push the local git repository to GitHub.
4. Add the three GitHub Actions secrets listed above.
5. Run the GitHub Actions workflow manually with `dry_run=true`.
6. If the dry run succeeds, run the workflow normally.
7. After GitHub deploy/setup work is finished, revoke the temporary Supabase CLI access token.

## Reset / Recovery Rules

- If the GitHub password is unknown, reset it from GitHub or use Google login.
- If the Supabase dashboard password is unknown, reset it from Supabase login.
- If the Supabase DB password is uncertain, reset it in the Supabase dashboard
  before production use.
- If `DROPRADAR_INGEST_SECRET` is lost, generate a new one, update Supabase
  Function secrets, then update GitHub Actions secrets.
- If a service-role key is exposed, rotate it immediately from Supabase.

## Operating Boundary

Codex can manage code, documentation, setup steps, checks, schema, workflows,
and non-secret operational state in this project.

The owner must keep actual passwords and recovery methods outside the repo,
preferably in a password manager or the browser's saved-password vault.
