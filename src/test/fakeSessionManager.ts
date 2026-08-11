import { Agent } from "@atproto/api";

export type RecordedRequest = { method: string; nsid: string; pathname: string };

type HandlerFn = (url: URL, init: RequestInit) => unknown;
export type Handlers = Record<string, unknown | HandlerFn>;

export const FAKE_USER_DID = "did:plc:testuser00000000000000";

export type FakeSession = {
  did: string;
  fetchHandler(url: string, init: RequestInit): Promise<Response>;
  signOut(): Promise<void>;
};

/**
 * A fake, in-memory SessionManager (`fetchHandler`) that never touches the
 * network — every "request" is intercepted and answered from canned
 * `handlers`, keyed by XRPC method (e.g. "app.bsky.feed.getTimeline"). Every
 * call is recorded so tests can assert exactly which — and how many —
 * network calls a piece of business logic actually makes. Structurally
 * compatible with both `SessionManager` (for `new Agent(...)`) and the
 * `OAuthSession`-shaped object `auth/session.ts` expects.
 */
export function createFakeSessionManager(
  handlers: Handlers,
  did: string = FAKE_USER_DID,
): { session: FakeSession; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];

  const session: FakeSession = {
    did,
    async fetchHandler(url: string, init: RequestInit): Promise<Response> {
      const parsed = new URL(url, "https://fake.pds.example");
      const nsid = parsed.pathname.replace(/^\/xrpc\//, "");
      requests.push({ method: init.method ?? "GET", nsid, pathname: parsed.pathname });

      const handler = handlers[nsid];
      if (handler === undefined) {
        return new Response(
          JSON.stringify({ error: "MethodNotImplemented", message: `no fake handler for ${nsid}` }),
          { status: 501, headers: { "content-type": "application/json" } },
        );
      }
      const body = typeof handler === "function" ? (handler as HandlerFn)(parsed, init) : handler;
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    },
    async signOut(): Promise<void> {
      // no-op: nothing to revoke against a fake transport
    },
  };

  return { session, requests };
}

/** Convenience wrapper for service-level tests that just need an Agent, not the raw session. */
export function createFakeAgent(handlers: Handlers): { agent: Agent; requests: RecordedRequest[] } {
  const { session, requests } = createFakeSessionManager(handlers);
  return { agent: new Agent(session), requests };
}
