import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { App } from "./App";
import { getOAuthClient } from "@/auth/oauthClient";
import { setAgentForTesting } from "@/api/agentService";
import { useAuthStore } from "@/store/authStore";
import { useNavigationStore } from "@/store/navigationStore";
import { createFakeSessionManager, type Handlers, type FakeSession } from "@/test/fakeSessionManager";
import {
  makeFeedViewPost,
  makePostView,
  makeProfileBasic,
  makeProfileDetailed,
  makeThreadViewPost,
  makeNotification,
  FIXTURE_CID,
} from "@/test/fixtures";

/**
 * A genuine end-to-end test: it renders the real component tree (App →
 * screens → services → store → a real @atproto/api Agent, including real
 * Lexicon response validation) and drives it exactly like a user would
 * (typing, clicking, waiting for re-renders). The only thing swapped out is
 * the transport two layers down — the fake session's `fetchHandler` — so
 * the whole test suite never touches the real network, matching the
 * project's "no unexpected network calls" requirement even at this level.
 */

vi.mock("@/auth/oauthClient", () => ({ getOAuthClient: vi.fn() }));

function mockOAuthClient(session: FakeSession | undefined) {
  const signIn = vi.fn(() => new Promise<never>(() => {})); // real signIn never resolves: it navigates the page away
  vi.mocked(getOAuthClient).mockResolvedValue({
    init: vi.fn().mockResolvedValue(session ? { session } : undefined),
    signIn,
  } as unknown as BrowserOAuthClient);
  return { signIn };
}

function signInAndRender(handlers: Handlers) {
  const { session, requests } = createFakeSessionManager(handlers);
  mockOAuthClient(session);
  render(<App />);
  return { requests };
}

beforeEach(() => {
  useNavigationStore.setState({ stack: [{ name: "timeline" }], current: { name: "timeline" } });
  useAuthStore.setState({ auth: { status: "loading" } });
});

afterEach(() => {
  setAgentForTesting(undefined);
  vi.clearAllMocks();
});

describe("signed-out flow", () => {
  it("shows the login screen and starts the OAuth redirect with the entered handle", async () => {
    const { signIn } = mockOAuthClient(undefined);
    render(<App />);

    await screen.findByText("Sign in to Bluesky");

    fireEvent.change(screen.getByPlaceholderText("handle.bsky.social"), {
      target: { value: "alice.bsky.social" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith("alice.bsky.social"));
  });
});

describe("signed-in flow", () => {
  it("loads the timeline and lets the user compose a new post", async () => {
    const seedPost = makeFeedViewPost({ post: makePostView({ text: "Existing post" }) });
    const { requests } = signInAndRender({
      "app.bsky.feed.getTimeline": { feed: [seedPost], cursor: undefined },
      "com.atproto.repo.createRecord": { uri: "at://did:plc:testuser00000000000000/app.bsky.feed.post/new1", cid: FIXTURE_CID },
    });

    await screen.findByText("Existing post");

    const textarea = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(textarea, { target: { value: "My very first post!" } });
    fireEvent.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() => expect(textarea).toHaveValue(""));

    const nsids = requests.map((r) => r.nsid);
    expect(nsids.filter((n) => n === "app.bsky.feed.getTimeline")).toHaveLength(2); // initial load + reload after posting
    expect(nsids).toContain("com.atproto.repo.createRecord");
    expect(nsids).not.toContain("com.atproto.identity.resolveHandle"); // no @mentions in this post
  });

  it("likes then unlikes a post", async () => {
    const post = makePostView({ text: "Like me" });
    const { requests } = signInAndRender({
      "app.bsky.feed.getTimeline": { feed: [makeFeedViewPost({ post })], cursor: undefined },
      "com.atproto.repo.createRecord": { uri: "at://did:plc:testuser00000000000000/app.bsky.feed.like/1", cid: FIXTURE_CID },
      "com.atproto.repo.deleteRecord": {},
    });

    await screen.findByText("Like me");
    const likeButton = document.querySelector('[data-kind="like"]') as HTMLButtonElement;
    expect(likeButton.dataset.active).toBe("false");

    fireEvent.click(likeButton);
    await waitFor(() => expect(likeButton.dataset.active).toBe("true"));

    fireEvent.click(likeButton);
    await waitFor(() => expect(likeButton.dataset.active).toBe("false"));

    expect(requests.map((r) => r.nsid)).toEqual([
      "app.bsky.feed.getTimeline",
      "com.atproto.repo.createRecord",
      "com.atproto.repo.deleteRecord",
    ]);
  });

  it("navigates from a post to its author's profile and follows them", async () => {
    const author = makeProfileBasic({ did: "did:plc:z72i7hdynmk6r22z27h6tvur", handle: "author.bsky.social", displayName: "Author" });
    const { requests } = signInAndRender({
      "app.bsky.feed.getTimeline": { feed: [makeFeedViewPost({ post: makePostView({ author, text: "hi" }) })], cursor: undefined },
      "app.bsky.actor.getProfile": makeProfileDetailed({ did: author.did, handle: author.handle, displayName: author.displayName }),
      "app.bsky.feed.getAuthorFeed": { feed: [], cursor: undefined },
      "com.atproto.repo.createRecord": { uri: "at://did:plc:testuser00000000000000/app.bsky.graph.follow/1", cid: FIXTURE_CID },
    });

    await screen.findByText("hi");
    fireEvent.click(screen.getByText("Author"));

    await screen.findByRole("button", { name: /^follow$/i });
    fireEvent.click(screen.getByRole("button", { name: /^follow$/i }));

    await screen.findByRole("button", { name: /^following$/i });
    expect(requests.map((r) => r.nsid)).toContain("com.atproto.repo.createRecord");
  });

  it("shows notifications and marks them seen", async () => {
    const { requests } = signInAndRender({
      "app.bsky.feed.getTimeline": { feed: [], cursor: undefined },
      "app.bsky.notification.listNotifications": { notifications: [makeNotification({ reason: "follow" })], cursor: undefined },
      "app.bsky.notification.updateSeen": {},
    });

    await screen.findByPlaceholderText("What's happening?");
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    await screen.findByText(/followed you/);
    await waitFor(() => expect(requests.map((r) => r.nsid)).toContain("app.bsky.notification.updateSeen"));
  });

  it("searches for a user and opens their profile", async () => {
    const found = makeProfileBasic({ did: "did:plc:z72i7hdynmk6r22z27h6tvur", handle: "findme.bsky.social", displayName: "Find Me" });
    signInAndRender({
      "app.bsky.feed.getTimeline": { feed: [], cursor: undefined },
      "app.bsky.actor.searchActors": { actors: [found], cursor: undefined },
      "app.bsky.actor.getProfile": makeProfileDetailed({ did: found.did, handle: found.handle, displayName: found.displayName }),
      "app.bsky.feed.getAuthorFeed": { feed: [], cursor: undefined },
    });

    await screen.findByPlaceholderText("What's happening?");
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    const searchInput = await screen.findByPlaceholderText("Search Bluesky");
    fireEvent.change(searchInput, { target: { value: "findme" } });
    fireEvent.click(searchInput.closest(".search-input-row")!.querySelector(".primary-button")!);

    await screen.findByText("Find Me");
    fireEvent.click(screen.getByText("Find Me"));

    await screen.findByText("@findme.bsky.social");
  });

  it("opens a thread and posts a reply", async () => {
    const rootPost = makePostView({ text: "Root post" });
    const { requests } = signInAndRender({
      "app.bsky.feed.getTimeline": { feed: [makeFeedViewPost({ post: rootPost })], cursor: undefined },
      "app.bsky.feed.getPostThread": { thread: makeThreadViewPost(rootPost, { replies: [] }) },
      "com.atproto.repo.createRecord": { uri: "at://did:plc:testuser00000000000000/app.bsky.feed.post/reply1", cid: FIXTURE_CID },
    });

    await screen.findByText("Root post");
    fireEvent.click(screen.getByText("Root post"));

    await screen.findByText("Post");
    const replyBox = await screen.findByPlaceholderText("Post your reply");
    fireEvent.change(replyBox, { target: { value: "Nice post!" } });
    fireEvent.click(screen.getByRole("button", { name: /^reply$/i }));

    await waitFor(() => expect(requests.map((r) => r.nsid)).toContain("com.atproto.repo.createRecord"));
  });
});
