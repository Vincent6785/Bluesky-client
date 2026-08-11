/**
 * Central place for every environment-derived setting. No other module should
 * read `import.meta.env` directly — this keeps configuration auditable in one
 * file, per the project's network-transparency requirement.
 */

/**
 * Handle resolution service used to turn `@handle.example` into a DID when no
 * DNS-over-HTTPS resolver is configured. Browsers cannot do raw DNS TXT
 * lookups, so this HTTPS endpoint is contacted for every handle resolution
 * (sign-in, mention autocomplete, profile lookups by handle).
 *
 * This necessarily talks to Bluesky's infrastructure (or whichever PDS/
 * entryway you point it at) — that's expected for a Bluesky client, not a
 * hidden third party. Override via VITE_HANDLE_RESOLVER to point at your own
 * PDS or a self-hosted DoH resolver instead.
 */
export const HANDLE_RESOLVER =
  import.meta.env.VITE_HANDLE_RESOLVER ?? "https://bsky.social";

/**
 * Public base URL this app is deployed at. Required in production because
 * the OAuth client_id for a public (non-loopback) client must be an HTTPS
 * URL that resolves to a hosted `client-metadata.json` document matching
 * this app's redirect URI. See public/client-metadata.json.
 */
export const APP_URL: string | undefined = import.meta.env.VITE_APP_URL;

/**
 * When true, every outgoing HTTP request is logged to the console with
 * METHOD / URL / STATUS / DURATION (never headers, bodies, tokens, or
 * cookies). Defaults to on in dev, off in production builds.
 */
export const DEBUG_NETWORK: boolean =
  import.meta.env.VITE_DEBUG_NETWORK === "true" ||
  (import.meta.env.VITE_DEBUG_NETWORK === undefined && import.meta.env.DEV);

export const IS_PROD: boolean = import.meta.env.PROD;
