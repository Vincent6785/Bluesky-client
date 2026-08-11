# Security Policy

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a security vulnerability —
that publishes the details before there's a fix.

**Preferred: GitHub Private Vulnerability Reporting**, enabled on this
repository. Use the "Report a vulnerability" button under the **Security**
tab (or go directly to `Security` → `Advisories` → `Report a vulnerability`
on the repository page). This opens a private conversation with the
maintainer that isn't visible to anyone else until a fix is ready.

**If that button isn't visible for some reason:** open a GitHub issue that
contains *no technical details* — just a note that you've found a possible
security issue and would like a private channel to report it — and wait for
the maintainer to follow up.

## What counts as a vulnerability here

Given what this project actually is (a browser SPA talking to the AT
Protocol network), the things that matter most are:

- Anything that could expose or leak a user's OAuth session, tokens, or
  DPoP keys (e.g. via logging, storage, or a crafted server response).
- Cross-site scripting or HTML/URL injection via content rendered from posts,
  profiles, or other AT Protocol data (this app deliberately treats all
  server-provided content as untrusted — see
  [ARCHITECTURE.md](./ARCHITECTURE.md)).
- OAuth flow issues: PKCE/state handling, redirect URI validation, or a way
  to force this app to send credentials/tokens somewhere unintended.
- A network call this app makes to a service other than the ones documented
  in the README's Privacy section and [ARCHITECTURE.md](./ARCHITECTURE.md#network-transparency) —
  i.e. anything that would contradict this project's privacy-first premise.
- Dependency vulnerabilities with a realistic exploit path in this app (not
  just an advisory that happens to match a package name — see if the
  vulnerable code path is actually reachable here).

## What *not* to report here

- Vulnerabilities in Bluesky's own servers/infrastructure (the PDS, App
  View, relay, etc.) — report those to Bluesky directly, not this project.
- Vulnerabilities in `@atproto/*` packages themselves — report those upstream
  at [bluesky-social/atproto](https://github.com/bluesky-social/atproto).
- Missing features (e.g. no quote-posts, no moderation UI) — that's tracked
  as regular issues, not security reports; see [CHANGELOG.md](./CHANGELOG.md)
  and [ARCHITECTURE.md](./ARCHITECTURE.md#known-mvp-limitations).

## Response

This is a small, independently maintained project without a paid security
team or an SLA — reports will be acknowledged and looked at on a best-effort
basis, prioritized by severity and reachability.
