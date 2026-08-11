# Changelog

All notable changes to this project are documented in this file. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project doesn't yet follow Semantic Versioning tags (no release has been cut
— see `package.json`'s `0.1.0`).

## [Unreleased]

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
