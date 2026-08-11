import type { AppBskyActorDefs, AppBskyFeedDefs, AppBskyNotificationListNotifications } from "@atproto/api";
import type { ThreadNode } from "@/models/post";

/** A real, well-formed example DID (the format Bluesky's own docs use) — needed because response fields are validated against the Lexicon's "did" format. */
export const FIXTURE_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
/** A syntactically valid CID — "cid"-format response fields are validated too. */
export const FIXTURE_CID = "bafyreiaizynclnqiolq7byfpjjtgqzn4sfrsgn7z2hhf6bo4utdwkin7ke";

let rkeyCounter = 0;
function nextRkey(): string {
  rkeyCounter += 1;
  return `3fixture${rkeyCounter}`;
}

export function makeProfileBasic(overrides: Partial<AppBskyActorDefs.ProfileViewBasic> = {}): AppBskyActorDefs.ProfileViewBasic {
  return {
    did: FIXTURE_DID,
    handle: "alice.bsky.social",
    displayName: "Alice",
    ...overrides,
  };
}

export function makeProfileView(overrides: Partial<AppBskyActorDefs.ProfileView> = {}): AppBskyActorDefs.ProfileView {
  return {
    did: FIXTURE_DID,
    handle: "alice.bsky.social",
    displayName: "Alice",
    ...overrides,
  };
}

export function makeProfileDetailed(
  overrides: Partial<AppBskyActorDefs.ProfileViewDetailed> = {},
): AppBskyActorDefs.ProfileViewDetailed {
  return {
    did: FIXTURE_DID,
    handle: "alice.bsky.social",
    displayName: "Alice",
    description: "Hello, I'm Alice.",
    followersCount: 10,
    followsCount: 5,
    postsCount: 3,
    ...overrides,
  };
}

export function makePostView(
  overrides: Partial<AppBskyFeedDefs.PostView> & { text?: string } = {},
): AppBskyFeedDefs.PostView {
  const { text = "Hello world", author, record, ...rest } = overrides;
  return {
    uri: `at://${FIXTURE_DID}/app.bsky.feed.post/${nextRkey()}`,
    cid: FIXTURE_CID,
    author: author ?? makeProfileBasic(),
    record: record ?? {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
    },
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    indexedAt: new Date().toISOString(),
    ...rest,
  };
}

export function makeFeedViewPost(overrides: Partial<AppBskyFeedDefs.FeedViewPost> = {}): AppBskyFeedDefs.FeedViewPost {
  return { post: makePostView(), ...overrides };
}

export function makeThreadViewPost(
  post: AppBskyFeedDefs.PostView,
  overrides: Partial<AppBskyFeedDefs.ThreadViewPost> = {},
): ThreadNode {
  return { $type: "app.bsky.feed.defs#threadViewPost", post, ...overrides };
}

export function makeNotification(
  overrides: Partial<AppBskyNotificationListNotifications.Notification> = {},
): AppBskyNotificationListNotifications.Notification {
  return {
    uri: `at://${FIXTURE_DID}/app.bsky.graph.follow/${nextRkey()}`,
    cid: FIXTURE_CID,
    author: makeProfileView(),
    reason: "follow",
    record: { $type: "app.bsky.graph.follow", createdAt: new Date().toISOString() },
    isRead: false,
    indexedAt: new Date().toISOString(),
    ...overrides,
  };
}
