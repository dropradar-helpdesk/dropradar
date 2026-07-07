# DropRadar App Build Notes

Updated: 2026-07-07

The plan is to ship a small native wrapper around the current web/PWA app, then fix issues while actually using it.

## Current App Strategy

- Use Capacitor as the native wrapper.
- Bundle the current static app into `native-www`.
- Keep the public web/PWA URL alive as the fast update and QA target.
- Do not add ads, analytics SDKs, push notifications, background GPS, login sync, or in-app purchases for the first app submission.
- Keep current location optional and foreground-only.

## App Identity

- App name: `DropRadar`
- Bundle/package ID draft: `com.dropradar.app`
- Web bundle directory: `native-www`
- Privacy URL: `https://dropradar-helpdesk.github.io/dropradar/privacy.html`
- Support / rights URL: `https://dropradar-helpdesk.github.io/dropradar/legal.html`
- Accessibility URL: `https://dropradar-helpdesk.github.io/dropradar/accessibility.html`

## Windows-Side Prep

From this folder:

```powershell
npm run release:qa
npm run build:native-web
```

This creates `native-www` and intentionally excludes local-only `data/app-config.json`.

## iOS Build Path

iOS still needs macOS + Xcode for the real project and App Store upload.

On a Mac:

```bash
npm install
npm run build:native-web
npx cap add ios
npx cap sync ios
npx cap open ios
```

Then in Xcode:

- Select the Apple Developer Team.
- Confirm bundle ID `com.dropradar.app`.
- Confirm iOS permission text before enabling any native location plugin.
- Run on an iPhone.
- Archive and send to TestFlight.

## Android Build Path

Android is secondary for the current target, but the wrapper is prepared:

```bash
npm install
npm run build:native-web
npx cap add android
npx cap sync android
npx cap open android
```

## First Submission Scope

Submit only the current core app:

- New product / limited / collab feed.
- Search and tracking requests.
- My Page favorites, budget, and schedule.
- Nearby spots with optional current-location sorting.
- Official links and policy pages.

Do not submit open chat, user image upload, ads, paid passes, push notifications, or background location in the first version.
