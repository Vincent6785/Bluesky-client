# Architecture

## Why these dependencies

**`@atproto/api`** — the official AT Protocol/Bluesky TypeScript SDK. It
provides `Agent` (session-aware XRPC client with `app.bsky.*`/`com.atproto.*`
convenience methods), `RichText` (mention/link/hashtag detection and
grapheme-accurate length), record/type validation, and moderation helpers.
Reimplementing any of this against the raw AT Protocol/Bluesky HTTP API would
duplicate well-tested, spec-compliant code for no benefit — the requirement
to "not reimplement the protocol unnecessarily" argues directly for using it.

**`@atproto/lex`** (evaluated, not used) — a 2026-era codegen CLI that
generates typed clients from arbitrary Lexicon schemas. It's positioned for
projects that need to talk to *custom or third-party* lexicons not already
covered by an SDK. `@atproto/api` already ships generated types and
convenience methods for the entire `app.bsky.*`/`com.atproto.*` surface this
client needs, so adding `lex` codegen on top would be a redundant second way
to do the same thing. If this client later adds support for a third-party
lexicon (e.g. a custom feed generator's config schema), reconsider `lex` for
*that* schema specifically — it's not an either/or with `@atproto/api`.

**`@atproto/oauth-client-browser`** — OAuth is the current recommended
auth mechanism for AT Protocol apps; the "app password" flow surfaced by
`CredentialSession` is explicitly marked deprecated in `@atproto/api`'s own
README. Of the three environment-specific OAuth packages
(`-browser`, `-node`, base `-client`), `-browser` is the one built for a
client-side SPA: it handles PKCE, DPoP (via non-exportable WebCrypto
keypairs), and session persistence in IndexedDB internally, and supports the
AT Protocol "loopback client" special case for localhost development with no
hosted metadata required.

**`zustand`** — the only state-management dependency. Chosen over React
Context+reducer boilerplate for the small amount of cross-cutting state this
app has (auth session, in-app navigation stack): it's ~1KB, has no network
activity of its own, and needs no provider tree. Server data (timeline,
threads, profiles, etc.) is intentionally *not* centralized in a store — it's
fetched per-screen through `services/` via a small `useAsync` hook, since
this MVP doesn't yet need cross-screen cache sharing/invalidation. If that
need shows up, it's a targeted addition, not a rewrite.

**No router library** — navigation is a single explicit stack
(`store/navigationStore.ts`) covering five screens. A full router (React
Router etc.) would add a dependency and URL-sync complexity this MVP doesn't
need yet; deep-linking to a specific post/profile URL is the natural reason
to add one later.

## Layers

```
ui/          React components and screens. Imports services/ and store/ only
             — never api/, auth/, or @atproto/*. This is the boundary that
             keeps the UI decoupled from network calls.
store/       zustand stores: auth session state, in-app navigation.
services/    Business logic (timeline, posts, profiles, threads,
             notifications, search, media, rich text). The only callers of
             api/agentService.
models/      Thin type aliases over @atproto/api's generated Lexicon types,
             so the rest of the app imports from "@/models/*" instead of
             reaching into @atproto/api's namespacing directly.
api/         agentService.ts: the one module allowed to hold an Agent
             instance. Everything else gets one via getAgent().
auth/        OAuth client setup and sign-in/sign-out/session-restore.
errors/      describeError.ts: turns anything thrown by the AT Protocol/OAuth
             SDKs (or our own code) into a {category, message} pair safe to
             show a user — network vs. auth vs. atproto vs. application —
             built on the SDKs' own error classes (XRPCError,
             OAuthCallbackError, ...) rather than string-matching.
network/     loggingFetch.ts: the fetch wrapper every layer above is routed
             through, for network transparency (see below).
config/      All environment-derived settings, read from import.meta.env in
             exactly one place (config/env.ts).
```

Data flow for, say, "like a post": `ui/PostCard` → `services/postService.like()`
→ `api/agentService.getAgent()` → `Agent.like()` → `OAuthSession.fetchHandler`
(built on `network/loggingFetch`) → the user's PDS.

## Authentication

- Sign-in uses the OAuth authorization-code flow with PKCE and DPoP,
  redirecting the browser to the user's PDS/authorization server
  (`auth/session.ts` → `BrowserOAuthClient.signIn`). This app's own code
  never sees a password.
- Tokens and the DPoP keypair are persisted by the SDK in IndexedDB, scoped
  to this app's origin; the keypair is generated as non-exportable via
  WebCrypto, so it cannot be exfiltrated by reading storage.
- `api/agentService.ts` holds the resulting `Agent` in memory only; it is
  rebuilt from the persisted `OAuthSession` on every page load via
  `restoreSession()`, not re-derived from any credential this app stores
  itself.
- Production deployment requires a hosted `client-metadata.json`
  (`public/client-metadata.json`) matching the deployed origin — see the
  README's deployment section. Development uses the AT Protocol's
  "loopback client" (`http://localhost?redirect_uri=...`), which needs no
  hosted document.

## Network transparency

Every HTTP call this app makes exists to talk to the AT Protocol network.
There are exactly four categories:

1. **XRPC calls to the user's PDS / the App View**, made through `Agent`
   (timeline, posts, profiles, follows, likes, reposts, notifications,
   search, blob upload). One call per user action or screen load; no
   polling, no background sync.
2. **OAuth flow calls** (authorization server metadata, token exchange/
   refresh, protected-resource metadata) — made by `@atproto/oauth-client-browser`.
3. **Handle resolution** (`@handle` → DID), needed because browsers can't do
   raw DNS lookups. Happens on sign-in and once per distinct `@mention` when
   composing a post (`RichText.detectFacets`). Goes to whatever
   `VITE_HANDLE_RESOLVER` is configured to (default: `bsky.social` — this is
   Bluesky's own infrastructure, which is expected for a Bluesky client, not
   a hidden third party; point it at your own PDS or a self-hosted
   DNS-over-HTTPS resolver to avoid it).
4. **CDN image fetches** the browser makes naturally when rendering
   `<img>` tags for avatars/post images, pointed at whatever CDN URL the App
   View returned in the response (typically Bluesky's).

Nothing else. There is no analytics, telemetry, crash reporting, or
advertising code anywhere in `src/`, and no such dependency in `package.json`.

**How this is enforced, not just asserted:**

- `network/loggingFetch.ts` is the single choke point: it's the `fetch`
  implementation handed to `BrowserOAuthClient`, which in turn is what every
  `Agent`/`OAuthSession` call ultimately goes through. Anything that bypassed
  it would be a code-review-visible anomaly (a raw `fetch()` call outside
  this file), not something buried in a dependency.
- It logs method, URL *without query string* (query strings can carry search
  terms, tokens, or handles), status, and duration — never headers, bodies,
  or cookies — visible live in the dev-only `DebugNetworkPanel`.
- `src/test/fakeSessionManager.ts` + the tests in `src/services/*.test.ts`
  assert the exact set of XRPC methods a given action calls, so a change
  that starts hitting an unexpected endpoint breaks the test suite.
- `src/ui/App.e2e.test.tsx` asserts the same thing at the whole-app level —
  e.g. that clicking Like fires exactly one `createRecord` and nothing else,
  through the real UI → store → service → Agent chain, not a mocked service
  layer.

## Known MVP limitations

Being upfront about what's deliberately out of scope for this pass, so it
doesn't get mistaken for an oversight:

- No infinite-scroll/pagination UI yet (`cursor` is threaded through the
  service layer and ready for it — `getTimeline`/`getAuthorFeed`/
  `listNotifications`/search all return one).
- No quote-posts, video embeds, or external-link card embeds (only
  `app.bsky.embed.images` is implemented).
- No content moderation/labeling UI (the SDK's `moderatePost()` and label
  preferences are available in `@atproto/api` but not wired up here).
- No offline support or client-side caching beyond the current screen.
- The production JS bundle is ~1.3MB unminified-equivalent before gzip
  (~308KB gzipped), dominated by `@atproto/api`'s generated Lexicon types;
  code-splitting by route would reduce initial load if that becomes a
  priority.
