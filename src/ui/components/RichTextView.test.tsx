import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AppBskyRichtextFacet } from "@atproto/api";
import { RichTextView } from "./RichTextView";

/**
 * Facets come straight from the network — including from posts authored by
 * clients other than this one — and a link facet's `uri` is just a lexicon
 * string with no scheme restriction. This suite exists specifically to
 * guard against rendering a dangerous scheme as a real, clickable `<a href>`.
 */
function linkFacet(uri: string, byteEnd: number): AppBskyRichtextFacet.Main {
  return {
    index: { byteStart: 0, byteEnd },
    features: [{ $type: "app.bsky.richtext.facet#link", uri }],
  };
}

describe("RichTextView", () => {
  it("renders an http(s) link facet as a real, clickable anchor", () => {
    render(<RichTextView text="see this" facets={[linkFacet("https://example.com/page", 8)]} />);
    const link = screen.getByRole("link", { name: "see this" });
    expect(link).toHaveAttribute("href", "https://example.com/page");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([
    ["javascript:alert(document.cookie)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["vbscript:msgbox(1)"],
    ["not a url at all"],
  ])("never turns a %s facet into a clickable link", (dangerousUri) => {
    render(<RichTextView text="click here" facets={[linkFacet(dangerousUri, 10)]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("click here")).toBeInTheDocument();
  });

  it("renders plain text unchanged when there are no facets", () => {
    render(<RichTextView text="just words" facets={undefined} />);
    expect(screen.getByText("just words")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
