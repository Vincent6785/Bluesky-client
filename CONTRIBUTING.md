# Contributing

Thanks for considering a contribution. This project is small on purpose —
please read [ARCHITECTURE.md](./ARCHITECTURE.md) before making structural
changes, so new code lands in the right layer.

## Setup

```bash
npm install
cp .env.example .env.local   # defaults are fine for local dev
npm run dev
```

Node.js 20+ is required. No account or API key is needed to develop the
app itself (only to sign in and use it) — see [README.md](./README.md) for
what network access is actually needed.

## Before opening a PR

Run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four must pass. `npm test` runs both the unit suite and the end-to-end
suite (`src/ui/App.e2e.test.tsx`) — neither needs a real Bluesky account or
network access; see the README's Testing section for how that works.

## Where things live

- `config/` — every environment-derived setting, read from `import.meta.env`
  in exactly one place.
- `network/` — the single `fetch` choke point (`loggingFetch.ts`).
- `auth/` — OAuth client setup and session lifecycle.
- `api/` — the only module allowed to hold an `Agent` instance
  (`agentService.ts`).
- `errors/` — categorizes thrown errors (network / auth / atproto /
  application) into safe, user-facing messages.
- `services/` — business logic; the only callers of `api/agentService`.
- `models/` — thin type aliases over `@atproto/api`'s generated Lexicon
  types.
- `store/` — the two pieces of cross-cutting state (auth session, in-app
  navigation), as small Zustand stores.
- `ui/` — React components and screens. Imports `services/` and `store/`
  only — never `api/`, `auth/`, or `@atproto/*` directly. Keep it that way;
  it's the seam that keeps the UI decoupled from network calls.

## Ground rules

- **Don't add network calls, dependencies, or storage without a stated
  reason.** This project's whole point is that every request it makes is
  accounted for (see the README's Privacy section and
  [ARCHITECTURE.md](./ARCHITECTURE.md#network-transparency)). If your change
  needs a new one, say why in the PR description.
- **No telemetry, analytics, or tracking SDKs**, full stop — see
  [SECURITY.md](./SECURITY.md) and the README for what "privacy-first" means
  here concretely.
- **Verify AT Protocol behavior against the actual SDK types/source**
  (`node_modules/@atproto/*/dist/*.d.ts`, or
  [bluesky-social/atproto](https://github.com/bluesky-social/atproto)) rather
  than assuming — the Lexicon and OAuth surface both evolve.
- **Prefer the existing types.** `@atproto/api` ships generated types for
  the whole `app.bsky.*`/`com.atproto.*` surface; add a type alias in
  `models/` rather than hand-rolling an approximation.
- Keep functions small and files single-purpose; put business logic in
  `services/`, not in components.
- New behavior worth relying on should come with a test — see the README's
  Testing section for the two layers (`src/test/fakeSessionManager.ts` +
  `src/test/fixtures.ts` for both).

## Commit messages / PRs

No enforced convention — clear, descriptive messages explaining *why* are
enough. Keep PRs focused on one change; mention any user-visible or
network-behavior change explicitly in the description.

## Reporting a security issue

Don't open a public issue for that — see [SECURITY.md](./SECURITY.md).
