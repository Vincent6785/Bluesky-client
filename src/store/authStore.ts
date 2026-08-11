import { create } from "zustand";
import type { OAuthSession } from "@atproto/oauth-client-browser";
import { restoreSession, signInWithHandle, signOut as endSession } from "@/auth/session";
import { setSession } from "@/api/agentService";
import { describeError } from "@/errors/describeError";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; did: string }
  | { status: "error"; message: string };

type AuthStore = {
  auth: AuthState;
  /** Restores a persisted session or completes an OAuth redirect callback. Call once at startup. */
  initialize: () => Promise<void>;
  /** Navigates away to the user's authorization server. Does not resolve on success. */
  signIn: (handle: string) => Promise<void>;
  signOut: () => Promise<void>;
};

let activeSession: OAuthSession | undefined;

export const useAuthStore = create<AuthStore>((set) => ({
  auth: { status: "loading" },

  initialize: async () => {
    try {
      const result = await restoreSession();
      if (result.status === "signed-in") {
        activeSession = result.session;
        setSession(result.session);
        set({ auth: { status: "signed-in", did: result.session.did } });
      } else {
        activeSession = undefined;
        setSession(undefined);
        set({ auth: { status: "signed-out" } });
      }
    } catch (error) {
      // A failed restore/callback (expired code, revoked session, network
      // error) must never leave the app stuck on the loading screen: fall
      // back to a clean signed-out state, with the reason surfaced so the
      // user isn't left guessing why they weren't signed in.
      activeSession = undefined;
      setSession(undefined);
      set({ auth: { status: "error", message: describeError(error).message } });
    }
  },

  signIn: async (handle: string) => {
    await signInWithHandle(handle);
  },

  signOut: async () => {
    // Clear local session state unconditionally, even if revoking the
    // session with the authorization server fails (e.g. offline). The
    // priority is that this app stops being able to act as the user; a
    // failed remote revocation shouldn't leave them looking "signed in", and
    // shouldn't surface as a rejected sign-out either — from the user's
    // perspective, this device is signed out either way.
    try {
      if (activeSession) await endSession(activeSession);
    } catch (error) {
      if (import.meta.env.DEV) console.debug("[auth] session revoke failed:", describeError(error).message);
    } finally {
      activeSession = undefined;
      setSession(undefined);
      set({ auth: { status: "signed-out" } });
    }
  },
}));
