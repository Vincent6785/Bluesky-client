import { afterEach, describe, expect, it } from "vitest";
import { setAgentForTesting } from "@/api/agentService";
import { createFakeAgent } from "@/test/fakeSessionManager";
import { detectFacets, previewSegments, segmentsFromFacets } from "./richTextService";

afterEach(() => setAgentForTesting(undefined));

describe("previewSegments", () => {
  it("splits plain text, links, and tags without any network access", () => {
    const segments = previewSegments("check https://example.com #atproto");
    expect(segments.map((s) => s.kind)).toEqual(["text", "link", "text", "tag"]);
  });

  it("marks unresolved mentions but leaves them without a resolved DID", () => {
    const segments = previewSegments("hi @someone.bsky.social");
    const mention = segments.find((s) => s.kind === "mention");
    expect(mention?.text).toBe("@someone.bsky.social");
  });
});

describe("detectFacets", () => {
  it("does not touch the network for text with no mentions", async () => {
    const { agent, requests } = createFakeAgent({});
    setAgentForTesting(agent);

    const result = await detectFacets("just a plain post, no @ symbols");

    expect(requests).toHaveLength(0);
    expect(result.text).toBe("just a plain post, no @ symbols");
  });

  it("resolves exactly one mention via com.atproto.identity.resolveHandle", async () => {
    const { agent, requests } = createFakeAgent({
      "com.atproto.identity.resolveHandle": { did: "did:plc:resolved0000000000000000" },
    });
    setAgentForTesting(agent);

    const result = await detectFacets("hello @friend.bsky.social");

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ nsid: "com.atproto.identity.resolveHandle" });
    expect(result.facets).toHaveLength(1);
  });
});

describe("segmentsFromFacets", () => {
  it("renders already-resolved facets without any network call", () => {
    const segments = segmentsFromFacets("hello world", undefined);
    expect(segments).toEqual([{ text: "hello world", kind: "text", target: undefined }]);
  });
});
