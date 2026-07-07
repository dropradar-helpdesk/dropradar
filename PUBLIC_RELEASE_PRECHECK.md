# DropRadar Public Release Precheck

Updated: 2026-07-07

## Current Release Position

DropRadar is close to a public web/PWA preview. It is not ready for App Store submission yet.

Ready enough for a controlled public web/PWA preview:

- GitHub Pages deployment is active.
- GitHub Pages deployment runs `npm run release:qa` before publishing.
- PWA manifest, icons, service worker, and offline page exist.
- Supabase public config uses only URL and anon publishable key.
- Admin writes require Supabase Auth admin role.
- Loginless tracking requests use RPC boundaries.
- GPS is optional and is not part of the backend storage model.
- Contact inbox is configured as `dropradar.helpdesk@gmail.com`.
- Public policy/contact page is available at `legal.html`.
- Privacy policy URL is available at `privacy.html`.
- Accessibility statement is available at `accessibility.html`.
- Store review notes draft is available at `store-submission-notes.md`.
- Daily official ingest workflow exists and is scheduled once per day.
- Approved tracking requests are read by daily ingest, matched against their source lane, and inserted into `intake_candidates` with `request_id`.

## Do Not Launch as a Store App Until These Are Done

- Lawyer review of copyright, trademark, crawling, privacy, and terms.
- Confirm the final privacy labels in `store-submission-notes.md` match the actual native wrapper / SDK behavior.
- Store screenshots that avoid third-party copyrighted images/logos.
- Native wrapper decision, for example PWA only first or Capacitor/TestFlight later.
- Final app store description clearly saying unofficial.
- Accessibility pass on keyboard, screen reader labels, contrast, text zoom, dialog focus, and touch target size.
- Takedown process test using the public Gmail.

## Operational Boundaries

- Do not rehost official product images or copyrighted visuals.
- Do not promise stock, lottery success, route success, or schedule accuracy.
- Do not store GPS history.
- Do not add analytics, ad SDKs, push notifications, native GPS background use, or login sync without updating `privacy.html`, `store-submission-notes.md`, and App Store / Google Play disclosures.
- Do not expose service-role keys, admin JWTs, DB passwords, or ingest secrets in public files.
- Do not enable open chat or user image uploads before moderation/reporting tools exist.

## Next Practical Step

The monitoring loop is now implementation-ready, but it still needs an operational smoke test after every Edge Function deploy:

1. Deploy `supabase/functions/ingest-official-sources`.
2. Run `npm run function:smoke`.
3. Approve a harmless tracking request that reuses an existing source lane.
4. Run the daily ingest manually once.
5. Confirm the request-linked candidate appears in `intake_candidates` and remains unpublished until admin review.

This keeps DropRadar as a daily self-growing app without letting unreviewed or unsafe requests become public automatically.
