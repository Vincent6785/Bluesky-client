# Bluesky Client

An independent, privacy-first Bluesky client built directly on the AT
Protocol — no official Bluesky client code, no telemetry, no analytics, no
ads, no third-party trackers.

**Why this exists:** to have a Bluesky client whose entire network footprint
is auditable by reading the code, without depending on the official app's
codebase or its build/distribution pipeline. Every request it makes is
accounted for — see [Privacy](#privacy) and
[ARCHITECTURE.md](./ARCHITECTURE.md#network-transparency).

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

## Architecture, in one path

Every user action follows the same path, top to bottom — there's no code
that reaches the network from anywhere else in the app:

```
ui/            React screens/components — never import @atproto/* directly
  ↓
store/         auth session state, in-app navigation (Zustand)
  ↓
services/      business logic (timeline, posts, profiles, threads, ...)
  ↓
api/           agentService.ts — the one module allowed to hold an Agent
  ↓
auth/          OAuth session (@atproto/oauth-client-browser)
  ↓
network/       loggingFetch.ts — the one `fetch` every request goes through
  ↓
Your PDS / the App View / the OAuth authorization server / the handle resolver
```

Full breakdown of layers and why each dependency exists:
[ARCHITECTURE.md](./ARCHITECTURE.md).

## What this project does *not* do

- It is **not an anonymity tool.** It's privacy-first in the sense that it
  adds no tracking, analytics, or unnecessary network calls of its own — but
  your PDS, the App View, and (by default) `bsky.social`'s handle-resolution
  service still see your IP address and requests, exactly as with any
  Bluesky client. If you want to change who sees what, point
  `VITE_HANDLE_RESOLVER` at your own PDS, or use network-level tools (a VPN,
  Tor) — that's outside this project's scope.
- It does not implement quote-posts, video embeds, external-link card
  embeds, content moderation/labeling UI, or offline support yet — see
  [ARCHITECTURE.md's Known MVP limitations](./ARCHITECTURE.md#known-mvp-limitations).
- It does not, and will not, include analytics, telemetry, crash reporting,
  or advertising SDKs of any kind.

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
  in IndexedDB, scoped to this app's origin. The only thing that SDK writes
  to `localStorage` is your DID (e.g. `did:plc:...`) as a pointer to which
  IndexedDB-stored session to restore on reload — a public identifier, not a
  credential. No token, key, or password is ever stored in `localStorage`,
  and this app's own code never holds a credential directly (it only ever
  holds the `Agent` object the OAuth SDK hands it).
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

No test anywhere uses a real Bluesky account, a real token, or a real
network call — see [SECURITY.md](./SECURITY.md) for what's in scope for a
vulnerability report if you find an exception to that.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build, an
`npm audit`, and a secret-pattern scan on every PR — no secrets required.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup, the
checks a PR needs to pass, and where different kinds of code belong. Please
also read the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](./SECURITY.md) for how to report a vulnerability — please
don't open a public issue for one.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT — see [LICENSE](./LICENSE). This project is independent and not
affiliated with or endorsed by Bluesky PBC. It depends on Bluesky's
`@atproto/*` packages (also MIT-licensed) but contains none of Bluesky's
own client code.
