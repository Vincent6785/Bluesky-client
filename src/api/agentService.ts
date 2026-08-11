import type { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-browser";

/**
 * The one module allowed to hold an {@link Agent} instance. Everything else
 * in the app (services, store, UI) goes through {@link getAgent} rather than
 * constructing or importing `Agent` directly — this is the seam that keeps
 * the UI decoupled from AT Protocol network calls, per the project's
 * architecture requirement.
 */
let currentAgent: Agent | undefined;

/**
 * Called by the auth store whenever the session changes (sign-in, sign-out,
 * restore). `@atproto/api` is dynamically imported here rather than at
 * module top level, so its (large, generated-Lexicon) bundle is only
 * fetched once there's an actual session to build an `Agent` from — a
 * signed-out visitor on the login screen never downloads it.
 */
export async function setSession(session: OAuthSession | undefined): Promise<void> {
  if (!session) {
    currentAgent = undefined;
    return;
  }
  const { Agent } = await import("@atproto/api");
  currentAgent = new Agent(session);
}

export function hasAgent(): boolean {
  return currentAgent !== undefined;
}

/** Test-only seam: inject a fully-constructed Agent (e.g. wrapping a fake SessionManager), bypassing OAuth entirely. */
export function setAgentForTesting(agent: Agent | undefined): void {
  currentAgent = agent;
}

/** Returns the active agent, or throws if there is no signed-in session. */
export function getAgent(): Agent {
  if (!currentAgent) {
    throw new Error("Not authenticated: no active AT Protocol session");
  }
  return currentAgent;
}
