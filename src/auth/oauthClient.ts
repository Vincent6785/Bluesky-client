import { BrowserOAuthClient, buildLoopbackClientId } from "@atproto/oauth-client-browser";
import { APP_URL, HANDLE_RESOLVER, IS_PROD, OAUTH_SCOPE } from "@/config/env";
import { createLoggingFetch } from "@/network/loggingFetch";

/**
 * Resolves the OAuth `client_id` for this app.
 *
 * - In production, public AT Protocol OAuth clients must use an HTTPS
 *   `client_id` that resolves to a hosted `client-metadata.json` document
 *   (see public/client-metadata.json). VITE_APP_URL must point at the
 *   deployed origin serving that file.
 * - In development, this builds the special "loopback client" `client_id`
 *   the AT Protocol spec defines for `http://127.0.0.1` / `localhost`,
 *   which needs no hosted metadata — but, critically, still has to encode
 *   the requested `scope` explicitly. `buildLoopbackClientId` alone only
 *   encodes `redirect_uri`; without an explicit `&scope=`, the resulting
 *   client_id parses back to the SDK's bare `atproto` default scope, which
 *   is identity-only and makes every real XRPC call (getTimeline, post,
 *   like, ...) fail with a 403 "Missing required scope" — the loopback
 *   client must request the same OAUTH_SCOPE production does.
 */
function resolveClientId(): string {
  if (!IS_PROD) {
    const loopbackClientId = buildLoopbackClientId(window.location);
    return `${loopbackClientId}&scope=${encodeURIComponent(OAUTH_SCOPE)}`;
  }
  if (!APP_URL) {
    throw new Error(
      "VITE_APP_URL must be set for production builds so the OAuth client_id can point at a hosted client-metadata.json",
    );
  }
  return `${APP_URL.replace(/\/+$/, "")}/client-metadata.json`;
}

let clientPromise: Promise<BrowserOAuthClient> | undefined;

/**
 * Lazily builds a single shared {@link BrowserOAuthClient}. All HTTP traffic
 * this client generates (token requests, PDS/authorization-server metadata
 * fetches, DID/handle resolution) is routed through {@link createLoggingFetch}
 * so it shows up in the network debug log like every other request.
 */
export function getOAuthClient(): Promise<BrowserOAuthClient> {
  clientPromise ??= BrowserOAuthClient.load({
    clientId: resolveClientId(),
    handleResolver: HANDLE_RESOLVER,
    fetch: createLoggingFetch(),
  });
  return clientPromise;
}
