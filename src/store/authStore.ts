import { create } from "zustand";
import type { OAuthSession } from "@atproto/oauth-client-browser";
import { restoreSession, signInWithHandle, signOut as endSession } from "@/auth/session";
import { setSession } from "@/api/agentService";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; did: string };

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
  },

  signIn: async (handle: string) => {
    await signInWithHandle(handle);
  },

  signOut: async () => {
    if (activeSession) await endSession(activeSession);
    activeSession = undefined;
    setSession(undefined);
    set({ auth: { status: "signed-out" } });
  },
}));
