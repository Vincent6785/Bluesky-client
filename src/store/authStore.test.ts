import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { useAuthStore } from "./authStore";
import { getOAuthClient } from "@/auth/oauthClient";
import { hasAgent, setAgentForTesting } from "@/api/agentService";
import { createFakeSessionManager, FAKE_USER_DID } from "@/test/fakeSessionManager";

/**
 * Covers the auth state machine without ever touching a real OAuth server:
 * `@/auth/oauthClient` (our own thin wrapper around BrowserOAuthClient) is
 * mocked, so `auth/session.ts` and `authStore.ts` run for real against a
 * fake client shaped exactly like the SDK's.
 */
vi.mock("@/auth/oauthClient", () => ({ getOAuthClient: vi.fn() }));

type FakeClient = { init: ReturnType<typeof vi.fn>; signIn: ReturnType<typeof vi.fn> };

function mockClient(overrides: Partial<FakeClient> = {}): FakeClient {
  const client: FakeClient = {
    init: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn(() => new Promise(() => {})), // real signIn never resolves: it navigates the page away
    ...overrides,
  };
  vi.mocked(getOAuthClient).mockResolvedValue(client as unknown as BrowserOAuthClient);
  return client;
}

beforeEach(() => {
  useAuthStore.setState({ auth: { status: "loading" } });
});

afterEach(() => {
  setAgentForTesting(undefined);
  vi.clearAllMocks();
});

describe("authStore.initialize", () => {
  it("restores a persisted session and builds an agent from it", async () => {
    const { session } = createFakeSessionManager({});
    mockClient({ init: vi.fn().mockResolvedValue({ session }) });

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().auth).toEqual({ status: "signed-in", did: FAKE_USER_DID });
    expect(hasAgent()).toBe(true);
  });

  it("falls back to signed-out when there is no session to restore", async () => {
    mockClient(); // init() resolves undefined: no session, no in-flight callback

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().auth).toEqual({ status: "signed-out" });
    expect(hasAgent()).toBe(false);
  });

  it("surfaces a failed OAuth callback as an error state instead of hanging on loading forever", async () => {
    mockClient({ init: vi.fn().mockRejectedValue(new Error("state parameter mismatch")) });

    await useAuthStore.getState().initialize();

    const auth = useAuthStore.getState().auth;
    expect(auth.status).toBe("error");
    expect(hasAgent()).toBe(false); // must not leave a stale/partial agent around
  });
});

describe("authStore.signIn", () => {
  it("starts the OAuth redirect with the given handle", async () => {
    const client = mockClient();

    void useAuthStore.getState().signIn("alice.bsky.social");

    await vi.waitFor(() => expect(client.signIn).toHaveBeenCalledWith("alice.bsky.social"));
  });
});

describe("authStore.signOut", () => {
  it("clears the session and the agent", async () => {
    const { session } = createFakeSessionManager({});
    mockClient({ init: vi.fn().mockResolvedValue({ session }) });
    await useAuthStore.getState().initialize();

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().auth).toEqual({ status: "signed-out" });
    expect(hasAgent()).toBe(false);
  });

  it("still clears local session state even when the remote revoke call fails", async () => {
    const { session } = createFakeSessionManager({});
    session.signOut = vi.fn().mockRejectedValue(new Error("network down"));
    mockClient({ init: vi.fn().mockResolvedValue({ session }) });
    await useAuthStore.getState().initialize();

    await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();

    expect(useAuthStore.getState().auth).toEqual({ status: "signed-out" });
    expect(hasAgent()).toBe(false);
  });
});
