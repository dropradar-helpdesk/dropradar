# DropRadar Legal / Accessibility Guardrails

This is a product guardrail checklist, not legal advice. Before public launch, have a Japanese lawyer review IP, scraping, privacy, and terms.

## Core Legal Position

- Operate as an unofficial information organizer.
- Use official announcement URLs as the source of truth.
- Store facts: title, date, deadline, official URL, location, method, purchase limit, and short original summaries.
- Do not store or redistribute copyrighted images, manga panels, anime stills, videos, music, long excerpts, campaign artwork, or product photos unless licensed or explicitly permitted.
- Do not use fake images that imitate official characters, packaging, logos, key visuals, or product photos. Use neutral category markers instead.
- Do not imply partnership, sponsorship, or endorsement by rights holders.
- Brand names and work titles are nominative references only; show a clear non-affiliation notice.
- Show a clear no-guarantee notice: the app monitors sources but may miss, delay, or fail to reflect changes; users remain responsible for final official checks, purchase / lottery actions, travel decisions, and their own fan-activity management.
- Do not promise acquisition, stock, lottery success, route success, or schedule accuracy; disclaim responsibility for failed purchases, missed entries, schedule changes, transportation costs, purchase costs, and related losses.
- Public contact route: `dropradar.helpdesk@gmail.com`. The Gmail account is created; keep account recovery enabled and periodically test receiving contact, correction, and takedown emails.

## Copyright Rules

- Safe default: facts and links yes; copied expression no.
- Summaries must be original and short.
- Avoid plot summaries, spoilers, dialogue, scans, screenshots, key visuals, PV clips, lyrics, and campaign art.
- If a rights holder asks for removal, remove first and review later.
- If user posts are added, prepare a takedown process and a DMCA agent path before US-facing launch.
- Rights-holder takedown requests should use the visible contact route and a searchable subject such as `DropRadar 権利者削除依頼`.

## Trademark / Brand Rules

- Use work names and brand names only to identify the relevant official announcement.
- Do not use official logos as app UI, icons, category badges, or decorative assets.
- Do not make app name, screenshots, or App Store metadata look official.
- Add “unofficial” wording in app, website footer, privacy/terms, and store listing.

## Data Collection / Scraping Rules

- Prefer official RSS, press pages, APIs, sitemaps, and allowed campaign pages.
- Check robots.txt and terms for each source.
- Respect rate limits and cache pages.
- Link out to the official page instead of copying the page.
- Keep a source audit log: source URL, checked time, extracted fields, and confidence.
- Do not bypass logins, paywalls, anti-bot systems, or geographic restrictions.

## Source Registry Rules

- Maintain a source registry before building crawlers.
- Each source needs: official URL, allowed collection method, check cadence, extracted fields, risk notes, and last review time.
- Separate official facts, store-specific notices, and user reports in both data and UI.
- Classify sources as automation-ready, human-review, or later/moderation-required.
- Treat social posts as hints unless they are official accounts and terms allow collection.
- Do not publish stock guarantees; link to official store search or campaign pages instead.
- Re-check source terms before adding ads, paid placement, or public notifications.
- Source-monitoring copy must say "tracked but not guaranteed" and direct users to official pages before acting.

## User Reports / Chat Rules

- Start with structured reports, not open chat.
- Allowed initial report types: stock seen, sold out, line long, ticket ended, store limit seen.
- Require timestamp and rough location/source.
- Separate official facts from user reports visually and in data.
- Add report, block, delete, and moderator review paths before public chat.
- No DM at first.
- Ban resale solicitation, personal data, harassment, employee doxxing, and unlicensed image uploads.

## Privacy / Location

- Collect the minimum data needed.
- Location should be optional and approximate by default.
- Do not require location, push notifications, or tracking to use core browsing.
- If the user refuses GPS, keep the main app usable and disable only current-location side features such as nearby sorting.
- Do not misuse, sell, store, or share user GPS location with third parties.
- Keep current location in temporary client state only; do not create a user-location history table by default.
- For external map handoff, pass only the destination when possible. Do not send the user's current coordinates from DropRadar to third-party map services.
- If loginless request voting is enabled, use anonymous device fingerprints only for duplicate prevention, do not expose raw fingerprints to the public client, and describe the purpose in the privacy policy.
- Publish privacy policy before App Store submission.
- Explain what is collected, why, retention/deletion, and third-party sharing.

## Accessibility Baseline

- Target WCAG 2.2 AA.
- Keyboard-only navigation must work.
- All icon-only buttons need accessible names.
- Search and forms need labels.
- Do not communicate status by color alone.
- Maintain visible focus styles.
- Dialogs must expose role, modal state, close button, and focus movement.
- Text must remain usable at 200% zoom.
- Add a public accessibility contact path before launch.

## App Store / Google Play

- Store metadata must accurately describe the app as unofficial.
- If user-generated content exists, include moderation, reporting, blocking, and contact info.
- Privacy policy must be linked inside the app and store metadata.
- Do not use third-party IP in screenshots unless licensed or replaced by neutral mock art.

## Launch Checklist

- Legal pages: Terms, Privacy, Copyright/Takedown, Accessibility, Contact.
- Periodically inbox-test `dropradar.helpdesk@gmail.com`; keep `data/contact.json` status active while the mailbox is working.
- Source registry with allowed crawl method for each official site.
- No official logos or copyrighted visuals in app UI.
- No fake official-looking visuals in app UI.
- Accessibility pass: keyboard, screen reader labels, contrast, zoom, reduced motion.
- UGC off until moderation tools exist.
- Lawyer review before monetization or US App Store marketing.

## Primary References

- DOJ ADA web accessibility guidance: https://www.ada.gov/resources/web-guidance/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- U.S. Copyright Office fair use overview: https://www.copyright.gov/fair-use/
- U.S. Copyright Office DMCA designated agent guidance: https://www.copyright.gov/dmca-directory/
- Japan Copyright Act, Articles 23, 32, and 48: https://www.japaneselawtranslation.go.jp/en/laws/view/3379
- Japan Patent Office trademark overview: https://www.jpo.go.jp/system/trademark/gaiyo/seidogaiyo/chizai08.html
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
