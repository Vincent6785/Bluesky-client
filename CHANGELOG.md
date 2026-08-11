# Changelog

All notable changes to this project are documented in this file. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project doesn't yet follow Semantic Versioning tags (no release has been cut
— see `package.json`'s `0.1.0`).

## [Unreleased]

### Fixed (found testing against a real Bluesky account)

- **The dev (loopback) OAuth client requested no explicit scope**, so it
  fell back to the SDK's bare `atproto` default (identity-only) instead of
  `transition:generic` (full account access) — which
  `public/client-metadata.json` already correctly requests for production.
  Every real XRPC call (timeline, posts, likes, ...) failed with a 403
  "Missing required scope" right after a successful sign-in. Fixed by
  building the loopback `client_id` with an explicit `&scope=` matching
  production (`config/env.ts`'s new `OAUTH_SCOPE`, used by both paths in
  `auth/oauthClient.ts`). Anyone who signed in before this fix needs to sign
  out and back in to get a correctly-scoped token.
- `authStore.initialize()` had no guard against concurrent invocation. In
  practice this was reachable via React StrictMode's deliberate
  double-invoke of effects in development: since an OAuth authorization
  code is single-use, a second concurrent call could fail redeeming an
  already-consumed code and clobber the first call's successful sign-in.
  Now concurrent calls share one in-flight attempt; a call after the first
  has settled still runs for real (so "Try again" keeps working). Covered
  by tests.
- Neither `authStore.initialize()`'s catch block nor `useAsync`'s fetch
  failures logged the raw error anywhere — only the safe, categorized
  message shown to the user was visible, making failures like the scope
  issue above hard to diagnose from the browser console. Both now
  `console.error` the raw error in dev builds only.

### Fixed (deep audit pass)

- No `<img>`/`<div>` click targets (post cards, notifications, search
  results, thread ancestors) were reachable or activatable by keyboard —
  none had `role`, `tabIndex`, or an Enter handler. Added all three, and
  added `aria-label`s to icon-only buttons and placeholder-only inputs that
  had no accessible name.
- No React error boundary existed anywhere: an unexpected render error in
  any single screen would blank the entire app. Added `ErrorBoundary`
  (`src/ui/components/ErrorBoundary.tsx`), mounted at the app root and
  around the per-screen router (keyed by view, so navigating away from a
  crashed screen recovers automatically).
- `mediaService.MAX_IMAGE_BYTES` was still 1 MB; `@atproto/api`'s bundled
  lexicon (`app.bsky.embed.images#image`) has allowed up to 2 MB since
  v0.19.7 — the client was rejecting valid uploads the PDS would accept.
- Added semantic landmarks (`<header>`, `<main>`, labeled `<nav>`) and a
  dynamic `document.title` per screen, neither of which existed before.
- A squash-merge of an earlier PR caused a "sync dev with main" merge to
  silently discard a `dev`-only commit (a `CONTRIBUTING.md` correction).
  Re-applied the lost content and disabled squash/rebase merge on the
  repository (merge commit only) so `dev` and `main` histories can't
  diverge like that again.

### Added

- Initial MVP: OAuth sign-in, session restore/logout, timeline, threads,
  profiles, follow/unfollow, like/unlike, repost/undo-repost, post
  create/delete, image upload, notifications, user + post search, RichText
  (mentions/links/hashtags).
- Layered architecture (`config/` → `network/` → `auth/` → `api/` →
  `errors/` → `services/` → `store/` → `ui/`) keeping the UI decoupled from
  AT Protocol network calls — see `ARCHITECTURE.md`.
- Centralized, loggable network transport (`network/loggingFetch.ts`) with a
  dev-only debug panel (method/URL/status/duration, never headers/tokens).
- `errors/describeError.ts`: categorizes thrown errors (network / auth /
  atproto / application) into safe, consistent user-facing messages, built
  on the real `XRPCError` / `OAuthCallbackError` / `OAuthResolverError` /
  `OAuthResponseError` types instead of ad hoc `instanceof Error` checks.
- Unit test suite (services, store, network layer, error categorization,
  rich-text rendering) plus an end-to-end suite
  (`src/ui/App.e2e.test.tsx`) that drives the real component tree against a
  fake AT Protocol transport — no real account or network access needed for
  either.
- GitHub Actions CI (lint, typecheck, test, build, dependency audit, secret
  pattern scan) and Dependabot config, none requiring secrets.
- Open-source hygiene: `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, this changelog.

### Fixed

*(Hardening pass ahead of the intended public release.)*

- `authStore.initialize()` didn't catch errors from OAuth session
  restoration/callback handling (a real, reachable failure mode —
  `BrowserOAuthClient.init()` throws on an invalid/expired callback or a
  revoked session), which left the app stuck on an infinite loading screen.
  It now falls back to a clean signed-out state with a visible, categorized
  error and a retry action.
- `authStore.signOut()` didn't clear local session/agent state if the
  remote session-revocation call failed (e.g. offline), leaving the UI
  showing "signed in" after the user clicked sign out. Local state now
  always clears; a failed remote revoke is logged (dev-only) but never
  blocks or fails the sign-out from the user's perspective.
- Several UI actions (like/unlike, repost/undo, delete post, follow/unfollow)
  had no error handling — a failed request left the button silently stuck
  with no feedback. All now surface a categorized, safe error message.
- `RichTextView` rendered any link facet's URI as a real `<a href>` with no
  scheme validation. Since facets come from network data (potentially from
  posts authored by other clients), a `javascript:`/`data:`/etc. URI could
  have been rendered as a clickable link. Only `http:`/`https:` URIs are
  rendered as links now; anything else renders as inert text.
- README's privacy section previously claimed nothing is stored in
  `localStorage`; corrected to reflect that the OAuth SDK stores the
  signed-in DID there as a restore pointer (a public identifier, not a
  credential) — tokens and DPoP keys remain IndexedDB-only.

### Changed

- Upgraded `@atproto/api` (0.15→0.20) and `@atproto/xrpc` (0.7→0.8); Node.js
  22+ is now required (`@atproto/api` 0.20.0 dropped Node 18/20 support).
- Upgraded ESLint (9→10, with `@eslint/js`/`typescript-eslint`/the two
  `eslint-plugin-react-*` packages) and Vite (6→8, with
  `@vitejs/plugin-react`).
- `api/agentService.ts` now dynamically imports `@atproto/api`'s `Agent`
  only once a session actually exists, and the five main screens are
  `React.lazy()`-loaded — a signed-out visitor's initial bundle no longer
  includes `@atproto/api`'s ~103KB-gzip chunk.
- The repository is now public, with GitHub Private Vulnerability Reporting
  and Dependabot security alerts enabled.
