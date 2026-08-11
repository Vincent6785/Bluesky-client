import { Fragment } from "react";
import { segmentsFromFacets } from "@/services/richTextService";
import { useNavigationStore } from "@/store/navigationStore";

/**
 * Post facets come from the network — including from clients other than
 * this one — and a link facet's URI is just a lexicon string with no scheme
 * restriction. Only ever render `http(s)` links as real, clickable `<a>`
 * hrefs; anything else (`javascript:`, `data:`, `vbscript:`, ...) is shown
 * as inert text instead of being handed to the browser.
 */
function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function RichTextView({ text, facets }: { text: string; facets: Parameters<typeof segmentsFromFacets>[1] }) {
  const push = useNavigationStore((s) => s.push);
  const segments = segmentsFromFacets(text, facets);

  return (
    <span className="post-text">
      {segments.map((segment, i) => {
        if (segment.kind === "mention" && segment.target) {
          const did = segment.target;
          return (
            <a
              key={i}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                push({ name: "profile", actor: did });
              }}
            >
              {segment.text}
            </a>
          );
        }
        if (segment.kind === "link" && segment.target && isSafeHttpUrl(segment.target)) {
          return (
            <a
              key={i}
              href={segment.target}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {segment.text}
            </a>
          );
        }
        return <Fragment key={i}>{segment.text}</Fragment>;
      })}
    </span>
  );
}
