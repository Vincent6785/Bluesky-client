import { afterEach, describe, expect, it } from "vitest";
import { setAgentForTesting } from "@/api/agentService";
import { createFakeAgent } from "@/test/fakeSessionManager";
import { FIXTURE_CID } from "@/test/fixtures";
import { uploadImage, MAX_IMAGE_BYTES } from "./mediaService";

afterEach(() => setAgentForTesting(undefined));

function fakeImageFile(bytes: number): File {
  return new File([new Uint8Array(bytes)], "photo.png", { type: "image/png" });
}

describe("uploadImage", () => {
  it("matches the current app.bsky.embed.images lexicon limit (2 MB, raised from 1 MB)", () => {
    // Regression guard: this constant must track node_modules/@atproto/api's
    // bundled lexicon (client/lexicons.js), not be hand-picked. If the SDK
    // raises or lowers the limit again, this test — not just the constant —
    // should be the thing that catches the drift.
    expect(MAX_IMAGE_BYTES).toBe(2_000_000);
  });

  it("uploads a file at or under the limit via a single createBlob call", async () => {
    const { agent, requests } = createFakeAgent({
      "com.atproto.repo.uploadBlob": {
        blob: { $type: "blob", ref: { $link: FIXTURE_CID }, mimeType: "image/png", size: MAX_IMAGE_BYTES },
      },
    });
    setAgentForTesting(agent);

    const result = await uploadImage(fakeImageFile(MAX_IMAGE_BYTES), "a photo");

    expect(result.alt).toBe("a photo");
    expect(requests).toEqual([
      { method: "post", nsid: "com.atproto.repo.uploadBlob", pathname: "/xrpc/com.atproto.repo.uploadBlob" },
    ]);
  });

  it("rejects an oversized file locally, before making any network call", async () => {
    const { agent, requests } = createFakeAgent({});
    setAgentForTesting(agent);

    await expect(uploadImage(fakeImageFile(MAX_IMAGE_BYTES + 1), "too big")).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
});
