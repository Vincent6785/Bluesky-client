# Bluesky Client

An independent, privacy-first Bluesky client built directly on the AT
Protocol — no official Bluesky client code, no telemetry, no analytics, no
ads, no third-party trackers.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the technical decisions behind
this project (why `@atproto/api`, why OAuth, why this environment, how the
network is kept transparent).

## Status

MVP: sign-in, timeline, posts (create/delete), threads, profiles,
follow/unfollow, like/unlike, repost/undo-repost, notifications, search
(users + posts), image upload, RichText (mentions/links/hashtags).

## Requirements

- Node.js 20+
- A Bluesky (or other AT Protocol) account to sign in with

## Getting started

```bash
npm install
cp .env.example .env.local   # adjust if needed; defaults work for local dev
npm run dev
```

Open the printed local URL. Sign-in redirects to your account's
authorization server (PDS) using OAuth — this app never sees your password.
In development, no extra setup is needed: the OAuth client falls back to the
AT Protocol "loopback client", a special-cased `client_id` for
`localhost`/`127.0.0.1` that needs no hosted metadata document.

## Scripts

| Command            | Purpose                                   |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Start the Vite dev server                  |
| `npm run build`     | Type-check and build for production        |
| `npm run preview`   | Preview the production build locally       |
| `npm run typecheck` | Type-check without emitting                |
| `npm run lint`      | Lint the codebase                          |
| `npm test`          | Run the full test suite (unit + E2E) once  |
| `npm run test:watch`| Run tests in watch mode                    |
| `npm run test:e2e`  | Run only the end-to-end suite              |

## Deploying to production

Public AT Protocol OAuth clients need an HTTPS `client_id` that resolves to a
hosted `client-metadata.json` document. Before deploying:

1. Edit [`public/client-metadata.json`](./public/client-metadata.json): set
   `client_id`, `client_uri`, and `redirect_uris` to your real deployed
   origin (they must match exactly — the OAuth server checks this).
2. Set `VITE_APP_URL` (see [`.env.example`](./.env.example)) to that same
   origin at build time.
3. Deploy `dist/` as static files, with `client-metadata.json` served as-is
   at `/client-metadata.json` with `content-type: application/json`.

## Privacy

- No analytics, telemetry, crash reporting, or advertising SDKs — none are
  present in the dependency tree, and none should ever be added. If a future
  dependency is found to phone home in a way not required for AT Protocol
  functionality, treat it as a bug.
- Every network call this app makes exists to talk to the AT Protocol
  network (your PDS, the App View, the handle resolver, the OAuth
  authorization server) — see [ARCHITECTURE.md](./ARCHITECTURE.md#network-transparency)
  for the full accounting and how to audit it yourself.
- Sessions (OAuth tokens, DPoP keys) are stored by `@atproto/oauth-client-browser`
  in IndexedDB, scoped to this app's origin. Nothing is stored in
  `localStorage` in plaintext, and no credentials are ever held by this
  app's own code.
- A dev-only debug panel (bottom-right corner, only rendered when
  `VITE_DEBUG_NETWORK` is on) lists every outgoing request's method, URL
  (without query string), status, and duration — and nothing else. It never
  reads headers, bodies, cookies, or tokens.

## Testing

Two layers, both network-transparent by construction:

- **Unit tests** (`src/**/*.test.ts`) exercise one service/module at a time.
- **End-to-end test** (`src/ui/App.e2e.test.tsx`, `npm run test:e2e`) renders
  the real component tree — `App` → screens → `store/` → `services/` →
  a real `@atproto/api` `Agent` (including real Lexicon response
  validation) — and drives it exactly like a user would: typing into the
  composer, clicking Like, navigating to a profile and following, searching,
  opening a thread and replying. The only thing swapped out is the OAuth
  client (`auth/oauthClient.ts`, mocked so no real `BrowserOAuthClient` /
  IndexedDB / WebCrypto is involved) and the transport underneath it
  (`src/test/fakeSessionManager.ts`, an in-memory fake `fetchHandler` that
  answers with fixture data from `src/test/fixtures.ts`). A real Bluesky
  account and a live PDS aren't needed to run it, and it never touches the
  network — appropriate for a privacy-first project's CI.

Both layers use `src/test/fakeSessionManager.ts`, which builds a real
`Agent` wired to that fake transport and records every call made through it.
Tests assert the exact set of XRPC methods a given action calls — e.g. that
composing a plain-text post fires exactly one `com.atproto.repo.createRecord`
and *no* `com.atproto.identity.resolveHandle` call, or that liking a post
doesn't also refetch the timeline — so a regression that starts hitting an
unexpected endpoint fails the suite, not just a manual audit.
