import { afterEach, describe, expect, it } from "vitest";
import { setAgentForTesting } from "@/api/agentService";
import { createFakeAgent } from "@/test/fakeSessionManager";
import { createPost, like, unlike, repost, unrepost, deletePost } from "./postService";

const FAKE_CID = "bafyreiaizynclnqiolq7byfpjjtgqzn4sfrsgn7z2hhf6bo4utdwkin7ke";

afterEach(() => setAgentForTesting(undefined));

describe("postService", () => {
  it("creates a plain-text post with a single createRecord call and no handle resolution", async () => {
    const { agent, requests } = createFakeAgent({
      "com.atproto.repo.createRecord": { uri: "at://did:plc:me/app.bsky.feed.post/abc", cid: FAKE_CID },
    });
    setAgentForTesting(agent);

    const ref = await createPost({ text: "hello world, no mentions here" });

    expect(ref.uri).toBe("at://did:plc:me/app.bsky.feed.post/abc");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ nsid: "com.atproto.repo.createRecord" });
  });

  it("resolves @mentions before creating the post, and nothing else", async () => {
    const { agent, requests } = createFakeAgent({
      "com.atproto.identity.resolveHandle": { did: "did:plc:mentioned000000000000000" },
      "com.atproto.repo.createRecord": { uri: "at://did:plc:me/app.bsky.feed.post/abc", cid: FAKE_CID },
    });
    setAgentForTesting(agent);

    await createPost({ text: "hey @friend.bsky.social!" });

    expect(requests.map((r) => r.nsid).sort()).toEqual(
      ["com.atproto.identity.resolveHandle", "com.atproto.repo.createRecord"].sort(),
    );
  });

  it.each([
    ["like", () => like({ uri: "at://did:plc:x/app.bsky.feed.post/1", cid: FAKE_CID })],
    ["repost", () => repost({ uri: "at://did:plc:x/app.bsky.feed.post/1", cid: FAKE_CID })],
  ] as const)("%s makes a single createRecord call", async (_name, action) => {
    const { agent, requests } = createFakeAgent({
      "com.atproto.repo.createRecord": { uri: "at://did:plc:me/app.bsky.feed.like/1", cid: FAKE_CID },
    });
    setAgentForTesting(agent);

    await action();

    expect(requests).toEqual([
      { method: "post", nsid: "com.atproto.repo.createRecord", pathname: "/xrpc/com.atproto.repo.createRecord" },
    ]);
  });

  it.each([
    ["unlike", () => unlike("at://did:plc:me/app.bsky.feed.like/1")],
    ["unrepost", () => unrepost("at://did:plc:me/app.bsky.feed.repost/1")],
    ["deletePost", () => deletePost("at://did:plc:me/app.bsky.feed.post/1")],
  ] as const)("%s makes a single deleteRecord call", async (_name, action) => {
    const { agent, requests } = createFakeAgent({
      "com.atproto.repo.deleteRecord": {},
    });
    setAgentForTesting(agent);

    await action();

    expect(requests).toEqual([
      { method: "post", nsid: "com.atproto.repo.deleteRecord", pathname: "/xrpc/com.atproto.repo.deleteRecord" },
    ]);
  });
});
