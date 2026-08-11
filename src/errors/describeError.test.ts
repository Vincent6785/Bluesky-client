import { describe, expect, it } from "vitest";
import { ResponseType, XRPCError } from "@atproto/xrpc";
import { OAuthCallbackError, OAuthResolverError } from "@atproto/oauth-client-browser";
import { describeError, isSessionInvalidError } from "./describeError";

describe("describeError", () => {
  it("categorizes a connectivity failure (XRPCError wraps it as ResponseType.Unknown)", () => {
    const error = new XRPCError(ResponseType.Unknown, "Unknown", "Failed to fetch");
    expect(describeError(error)).toEqual({
      category: "network",
      message: "Network error — check your connection and try again.",
    });
  });

  it("categorizes an expired/invalid session as an auth error", () => {
    const error = new XRPCError(401, "ExpiredToken", "Token has expired");
    const result = describeError(error);
    expect(result.category).toBe("auth");
    expect(isSessionInvalidError(error)).toBe(true);
  });

  it("categorizes a forbidden response as an auth error", () => {
    expect(describeError(new XRPCError(403, "Forbidden", "no")).category).toBe("auth");
  });

  it("categorizes a Lexicon validation failure distinctly, without leaking the raw validation error", () => {
    const error = new XRPCError(ResponseType.InvalidResponse, "InvalidResponse", "some internal zod message");
    const result = describeError(error);
    expect(result.category).toBe("atproto");
    expect(result.message).not.toContain("zod");
  });

  it("categorizes an ordinary server-rejected request as an AT Protocol error", () => {
    const error = new XRPCError(400, "InvalidRequest", "text too long");
    expect(describeError(error)).toEqual({ category: "atproto", message: "text too long" });
  });

  it("categorizes OAuth callback/resolver errors as auth errors", () => {
    const callbackError = new OAuthCallbackError(new URLSearchParams("error=access_denied"), "denied");
    expect(describeError(callbackError).category).toBe("auth");

    const resolverError = OAuthResolverError.from(new Error("boom"), "could not resolve handle");
    expect(describeError(resolverError).category).toBe("auth");
  });

  it("categorizes a raw fetch TypeError as a network error", () => {
    expect(describeError(new TypeError("Failed to fetch")).category).toBe("network");
  });

  it("falls back to a generic application message for non-Error values", () => {
    expect(describeError("just a string")).toEqual({ category: "application", message: "Something went wrong." });
    expect(describeError(undefined)).toEqual({ category: "application", message: "Something went wrong." });
  });

  it("never reports a non-auth error as session-invalid", () => {
    expect(isSessionInvalidError(new XRPCError(500, "InternalServerError"))).toBe(false);
  });
});
