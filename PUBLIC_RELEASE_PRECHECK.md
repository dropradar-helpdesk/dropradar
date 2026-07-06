# DropRadar Public Release Precheck

Updated: 2026-07-07

## Current Release Position

DropRadar is close to a public web/PWA preview. It is not ready for App Store submission yet.

Ready enough for a controlled public web preview:

- GitHub Pages deployment is active.
- PWA manifest, icons, service worker, and offline page exist.
- Supabase public config uses only URL and anon publishable key.
- Admin writes require Supabase Auth admin role.
- Loginless tracking requests use RPC boundaries.
- GPS is optional and is not part of the backend storage model.
- Contact inbox is configured as `dropradar.helpdesk@gmail.com`.
- Public policy/contact draft is available at `legal.html`.
- Daily official ingest workflow exists and is scheduled once per day.

## Do Not Launch as a Store App Until These Are Done

- Lawyer review of copyright, trademark, crawling, privacy, and terms.
- Final privacy policy wording for App Store metadata.
- Store screenshots that avoid third-party copyrighted images/logos.
- Native wrapper decision, for example PWA only first or Capacitor/TestFlight later.
- Final app store description clearly saying unofficial.
- Accessibility pass on keyboard, screen reader labels, contrast, text zoom, and dialog focus.
- Takedown process test using the public Gmail.
- Ingest request-routing connection: approved tracking requests should be read by daily ingest and linked to `intake_candidates` by `request_id`.

## Operational Boundaries

- Do not rehost official product images or copyrighted visuals.
- Do not promise stock, lottery success, route success, or schedule accuracy.
- Do not store GPS history.
- Do not expose service-role keys, admin JWTs, DB passwords, or ingest secrets in public files.
- Do not enable open chat or user image uploads before moderation/reporting tools exist.

## Next Practical Step

For the app to become useful beyond a static preview, connect approved tracking requests to the daily ingest engine:

1. Read `tracking_request_feed` rows with `watch_strategy = 'reuse_source'` and `matched_source_id`.
2. Group tracking keywords by `matched_source_id`.
3. Check crawled official links/text against those keywords.
4. Insert matching rows into `intake_candidates` with `request_id`.
5. Show unmatched approved requests as "not detected yet" in admin mode.

This is the next engineering step before calling the monitoring loop production-ready.
