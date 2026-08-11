import { afterEach, describe, expect, it } from "vitest";
import { setAgentForTesting } from "@/api/agentService";
import { createFakeAgent } from "@/test/fakeSessionManager";
import { getTimeline, getAuthorFeed } from "./timelineService";

afterEach(() => setAgentForTesting(undefined));

describe("timelineService", () => {
  it("fetches the timeline via exactly one call to app.bsky.feed.getTimeline", async () => {
    const { agent, requests } = createFakeAgent({
      "app.bsky.feed.getTimeline": { feed: [], cursor: "next-page" },
    });
    setAgentForTesting(agent);

    const page = await getTimeline({ limit: 10 });

    expect(page).toEqual({ feed: [], cursor: "next-page" });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: "get", nsid: "app.bsky.feed.getTimeline" });
  });

  it("does not contact any endpoint other than getAuthorFeed for an author feed request", async () => {
    const { agent, requests } = createFakeAgent({
      "app.bsky.feed.getAuthorFeed": { feed: [], cursor: undefined },
    });
    setAgentForTesting(agent);

    await getAuthorFeed("did:plc:someactor00000000000000");

    expect(requests.map((r) => r.nsid)).toEqual(["app.bsky.feed.getAuthorFeed"]);
  });
});
