import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoggingFetch, onNetworkActivity } from "./loggingFetch";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLoggingFetch", () => {
  it("passes requests through untouched to the underlying fetch", async () => {
    const baseFetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const fetch = createLoggingFetch(baseFetch as unknown as typeof globalThis.fetch);

    const init: RequestInit = { method: "POST", headers: { Authorization: "Bearer secret-token" } };
    await fetch("https://pds.example/xrpc/com.atproto.repo.createRecord", init);

    expect(baseFetch).toHaveBeenCalledWith("https://pds.example/xrpc/com.atproto.repo.createRecord", init);
  });

  it("emits method, redacted URL (no query string), status, and duration — nothing else", async () => {
    const baseFetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const fetch = createLoggingFetch(baseFetch as unknown as typeof globalThis.fetch);

    const events: unknown[] = [];
    const unsubscribe = onNetworkActivity((entry) => events.push(entry));
    await fetch("https://pds.example/xrpc/app.bsky.actor.getProfile?actor=secret-handle.bsky.social", {
      method: "GET",
    });
    unsubscribe();

    expect(events).toEqual([
      { method: "GET", url: "https://pds.example/xrpc/app.bsky.actor.getProfile", status: 200, durationMs: expect.any(Number) },
    ]);
  });

  it("still emits a log entry (status 'error') when the underlying fetch rejects, and rethrows", async () => {
    const baseFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const fetch = createLoggingFetch(baseFetch as unknown as typeof globalThis.fetch);

    const events: unknown[] = [];
    const unsubscribe = onNetworkActivity((entry) => events.push(entry));
    await expect(fetch("https://pds.example/xrpc/app.bsky.feed.getTimeline")).rejects.toThrow("network down");
    unsubscribe();

    expect(events).toEqual([
      { method: "GET", url: "https://pds.example/xrpc/app.bsky.feed.getTimeline", status: "error", durationMs: expect.any(Number) },
    ]);
  });

  it("never leaks an Authorization header, DPoP proof, or request body into a logged entry", async () => {
    const secretToken = "Bearer at-secret-token-value";
    const secretDpop = "eyJhbGciOiJFUzI1NiJ9.dpop-proof-jwt";
    const baseFetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const fetch = createLoggingFetch(baseFetch as unknown as typeof globalThis.fetch);

    const events: unknown[] = [];
    const unsubscribe = onNetworkActivity((entry) => events.push(entry));
    await fetch("https://pds.example/xrpc/com.atproto.repo.createRecord?token=also-secret", {
      method: "POST",
      headers: { Authorization: secretToken, DPoP: secretDpop, Cookie: "session=secret-cookie" },
      body: JSON.stringify({ text: "hello", refreshToken: "secret-refresh-token" }),
    });
    unsubscribe();

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(secretToken);
    expect(serialized).not.toContain(secretDpop);
    expect(serialized).not.toContain("secret-cookie");
    expect(serialized).not.toContain("secret-refresh-token");
    expect(serialized).not.toContain("also-secret"); // query string is stripped entirely, not just known secret params
    expect(events).toEqual([
      { method: "POST", url: "https://pds.example/xrpc/com.atproto.repo.createRecord", status: 200, durationMs: expect.any(Number) },
    ]);
  });
});
