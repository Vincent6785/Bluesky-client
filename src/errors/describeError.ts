import { ResponseType, XRPCError } from "@atproto/xrpc";
import { OAuthCallbackError, OAuthResolverError, OAuthResponseError } from "@atproto/oauth-client-browser";

/**
 * Broad category for an error, used to pick a safe, user-appropriate message
 * and (for auth errors) to decide whether the app should fall back to
 * signed-out state. Kept small on purpose — this isn't a general-purpose
 * error taxonomy, just the distinctions the UI actually needs to act on.
 */
export type ErrorCategory = "network" | "auth" | "atproto" | "application";

export type DescribedError = {
  category: ErrorCategory;
  /** Safe to render directly in the UI — never includes headers, tokens, or stack traces. */
  message: string;
};

/**
 * Turns any thrown value from the AT Protocol/OAuth SDKs (or our own code)
 * into a category + a message that's safe to show a user.
 *
 * Every call made through `Agent` (i.e. almost all network activity in this
 * app) surfaces failures as `XRPCError` — including plain connectivity
 * failures, which the SDK wraps as `XRPCError` with
 * `status === ResponseType.Unknown` (see `@atproto/xrpc`'s `XrpcClient.call`,
 * which does `catch (err) { throw XRPCError.from(err) }`). OAuth-flow calls
 * (sign-in, token refresh), which don't go through `Agent`, can still throw
 * a raw `TypeError` (the browser's own "Failed to fetch") or one of
 * `@atproto/oauth-client`'s dedicated error classes.
 */
export function describeError(error: unknown): DescribedError {
  if (
    error instanceof OAuthCallbackError ||
    error instanceof OAuthResolverError ||
    error instanceof OAuthResponseError
  ) {
    return { category: "auth", message: error.message || "Authentication failed. Please sign in again." };
  }

  if (error instanceof XRPCError) {
    if (error.status === ResponseType.Unknown) {
      return { category: "network", message: "Network error — check your connection and try again." };
    }
    if (error.status === ResponseType.AuthenticationRequired || error.status === ResponseType.Forbidden) {
      return { category: "auth", message: "Your session is no longer valid. Please sign in again." };
    }
    if (error.status === ResponseType.InvalidResponse) {
      return { category: "atproto", message: "The server returned data that didn't match the expected format." };
    }
    return { category: "atproto", message: error.message || "The server rejected the request." };
  }

  if (error instanceof TypeError) {
    // The browser's own network-failure shape (e.g. "Failed to fetch"), seen
    // for OAuth-flow requests that don't go through XrpcClient.
    return { category: "network", message: "Network error — check your connection and try again." };
  }

  if (error instanceof Error) {
    return { category: "application", message: error.message };
  }

  return { category: "application", message: "Something went wrong." };
}

/** True for errors that mean the current session is no longer usable and the app should fall back to signed-out state. */
export function isSessionInvalidError(error: unknown): boolean {
  return describeError(error).category === "auth";
}
