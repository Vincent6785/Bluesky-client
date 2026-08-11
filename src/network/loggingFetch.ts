import { DEBUG_NETWORK } from "@/config/env";

export type NetworkLogEntry = {
  method: string;
  url: string;
  status: number | "error";
  durationMs: number;
};

export type NetworkLogListener = (entry: NetworkLogEntry) => void;

const listeners = new Set<NetworkLogListener>();

/** Subscribe to network activity (e.g. for an in-app debug panel). Never receives headers, bodies, or credentials. */
export function onNetworkActivity(listener: NetworkLogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Strip query params: some XRPC calls pass tokens or user text (e.g. search "q") in the querystring.
    return `${url.origin}${url.pathname}`;
  } catch {
    return rawUrl;
  }
}

function emit(entry: NetworkLogEntry): void {
  if (DEBUG_NETWORK) {
    console.debug(
      `[network] ${entry.method} ${entry.url} -> ${entry.status} (${entry.durationMs.toFixed(0)}ms)`,
    );
  }
  for (const listener of listeners) listener(entry);
}

/**
 * Wraps a `fetch` implementation so every request/response is observable
 * (method, redacted URL, status, duration) without ever inspecting or
 * logging headers, cookies, request/response bodies, or query strings —
 * those are exactly where DPoP proofs, access tokens, and app passwords
 * live.
 */
export function createLoggingFetch(
  baseFetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis),
): typeof globalThis.fetch {
  return async function loggingFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const rawUrl = input instanceof Request ? input.url : input.toString();
    const url = redactUrl(rawUrl);
    const start = performance.now();
    try {
      const response = await baseFetch(input, init);
      emit({ method, url, status: response.status, durationMs: performance.now() - start });
      return response;
    } catch (error) {
      emit({ method, url, status: "error", durationMs: performance.now() - start });
      throw error;
    }
  };
}
