# DropRadar App Store Registration Pack

Updated: 2026-07-07

Use this when creating the first App Store Connect app record.

## Create New App

- Platform: iOS
- Name: DropRadar
- Primary language: Japanese
- Bundle ID: com.dropradar.app
- SKU: dropradar-ios-20260707
- User access: Full Access

If the Bundle ID is not selectable yet, create it first in Apple Developer:

- Identifier type: App IDs
- Platform: iOS, tvOS, watchOS
- Description: DropRadar
- Bundle ID type: Explicit
- Bundle ID: com.dropradar.app
- Capabilities for first build: none required

## Store Listing Draft

Subtitle:

```text
Official-link-first hobby drop tracker
```

Short description:

```text
DropRadar helps users track official announcements for hobby releases, limited goods, collaborations, manga and light-novel releases, events, favorites, budgets, and collection plans.
```

Review note:

```text
DropRadar is an unofficial organizer for official-announcement links. It does not rehost copyrighted product images, official logos, manga/anime images, videos, music, or long excerpts. Current location is optional and is requested only after the user taps the location button; it is used temporarily for nearby sorting and is not stored by DropRadar. User requests are moderated before any public listing is adopted. The app may show official search/source links, and users are instructed to confirm official pages before purchase, lottery entry, or travel.
```

## Category Draft

- Primary category: Entertainment
- Secondary category: Lifestyle

Reason: the app is a hobby and media-interest organizer, not a store, payment app, or ticketing app.

## URLs

- Privacy Policy URL: https://dropradar-helpdesk.github.io/dropradar/privacy.html
- Support URL: https://dropradar-helpdesk.github.io/dropradar/legal.html
- Rights / correction contact: dropradar.helpdesk@gmail.com

## App Privacy Draft

- Tracking: No.
- Ads: No.
- In-app purchases: No.
- Contact info: Not collected.
- Location: Do not mark as collected if it remains foreground-only and is not sent to the server.
- User content: Tracking request terms and votes may be stored for duplicate prevention and admin review.
- Identifiers: Only mark if the production request/vote abuse-control flow sends a persistent device or user identifier.
- Analytics: No SDK analytics in first release.

## First Submission Boundary

Submit the thin wrapper first:

- New product / limited / collab feed.
- Search and tracking requests.
- My Page favorites, budget, and schedule.
- Nearby spots with optional current-location sorting.
- Official links and public policy pages.

Do not include these in the first store version:

- Open chat.
- User image upload.
- Ads.
- Paid passes.
- Push notifications.
- Background location.

