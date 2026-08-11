import type { OAuthSession } from "@atproto/oauth-client-browser";
import { getOAuthClient } from "./oauthClient";

export type AuthResult =
  | { status: "signed-out" }
  | { status: "signed-in"; session: OAuthSession };

/**
 * Restores a previously persisted session (from the SDK's IndexedDB store)
 * or completes an in-flight OAuth redirect callback. Must be called once,
 * at app startup, before rendering anything that needs auth state.
 */
export async function restoreSession(): Promise<AuthResult> {
  const client = await getOAuthClient();
  const result = await client.init();
  if (!result) return { status: "signed-out" };
  return { status: "signed-in", session: result.session };
}

/**
 * Starts the OAuth authorization flow for the given handle or PDS URL. This
 * navigates the browser away to the user's authorization server — it does
 * not resolve on success.
 */
export async function signInWithHandle(handle: string): Promise<never> {
  const client = await getOAuthClient();
  await client.signIn(handle);
  throw new Error("unreachable: signIn navigates away before resolving");
}

export async function signOut(session: OAuthSession): Promise<void> {
  await session.signOut();
}
