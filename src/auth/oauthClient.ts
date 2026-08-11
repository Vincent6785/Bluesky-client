import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { APP_URL, HANDLE_RESOLVER, IS_PROD } from "@/config/env";
import { createLoggingFetch } from "@/network/loggingFetch";

/**
 * Resolves the OAuth `client_id` for this app.
 *
 * - In production, public AT Protocol OAuth clients must use an HTTPS
 *   `client_id` that resolves to a hosted `client-metadata.json` document
 *   (see public/client-metadata.json). VITE_APP_URL must point at the
 *   deployed origin serving that file.
 * - In development, `undefined` makes {@link BrowserOAuthClient} fall back
 *   to the special "loopback client" the AT Protocol spec defines for
 *   `http://127.0.0.1` / `localhost`, which needs no hosted metadata.
 */
function resolveClientId(): string | undefined {
  if (!IS_PROD) return undefined;
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
  clientPromise ??= (async () => {
    const fetch = createLoggingFetch();
    const clientId = resolveClientId();
    if (clientId) {
      return BrowserOAuthClient.load({ clientId, handleResolver: HANDLE_RESOLVER, fetch });
    }
    return new BrowserOAuthClient({ handleResolver: HANDLE_RESOLVER, fetch });
  })();
  return clientPromise;
}
