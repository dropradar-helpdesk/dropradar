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
