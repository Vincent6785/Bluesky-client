import { RichText } from "@atproto/api";
import type { AppBskyRichtextFacet } from "@atproto/api";
import { getAgent } from "@/api/agentService";

export type FacetedText = {
  text: string;
  facets: AppBskyRichtextFacet.Main[] | undefined;
};

/**
 * Detects links, hashtags, and `@mentions` in free-form post text and
 * resolves mentioned handles to DIDs. Mention resolution is a real network
 * call (handle -> DID, via the configured handle resolver) — one request per
 * distinct mention, made through the shared logging fetch.
 */
export async function detectFacets(text: string): Promise<FacetedText> {
  const richText = new RichText({ text });
  await richText.detectFacets(getAgent());
  return { text: richText.text, facets: richText.facets };
}

export type TextSegment = {
  text: string;
  kind: "text" | "link" | "mention" | "tag";
  /** Present for links: the URL to navigate to. Present for mentions: the mentioned account's DID. */
  target?: string;
};

/** Plain-text preview segments (link/mention/tag) without resolving mentions — safe to use without a network round-trip, e.g. for a composer's live preview. */
export function previewSegments(text: string): TextSegment[] {
  const richText = new RichText({ text });
  richText.detectFacetsWithoutResolution();
  return toTextSegments(richText);
}

/** Renders already-resolved facets (from a fetched post) into displayable segments — no network call. */
export function segmentsFromFacets(text: string, facets: FacetedText["facets"]): TextSegment[] {
  const richText = new RichText({ text, facets });
  return toTextSegments(richText);
}

function toTextSegments(richText: RichText): TextSegment[] {
  return [...richText.segments()].map((segment) => ({
    text: segment.text,
    kind: segment.isLink() ? "link" : segment.isMention() ? "mention" : segment.isTag() ? "tag" : "text",
    target: segment.link?.uri ?? segment.mention?.did,
  }));
}
