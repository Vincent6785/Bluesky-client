import { AppBskyFeedPost } from "@atproto/api";
import type { $Typed, AppBskyFeedDefs, ComAtprotoRepoStrongRef } from "@atproto/api";

export type Post = AppBskyFeedDefs.PostView;
export type FeedItem = AppBskyFeedDefs.FeedViewPost;
/** Tagged with a required `$type` — matches the shape of union members like `thread.replies[n]`, as opposed to a bare top-level `ThreadViewPost`. */
export type ThreadNode = $Typed<AppBskyFeedDefs.ThreadViewPost>;
export type ReplyRef = AppBskyFeedDefs.ReplyRef;
export type NotFoundPost = $Typed<AppBskyFeedDefs.NotFoundPost>;
export type BlockedPost = $Typed<AppBskyFeedDefs.BlockedPost>;

/** A reference to a specific record version, used to like/repost/reply to a post. */
export type StrongRef = ComAtprotoRepoStrongRef.Main;

export type PostRecord = AppBskyFeedPost.Record;

/** Type guard + reader for a post's underlying `app.bsky.feed.post` record (the `record` field on {@link Post} is untyped `unknown`). */
export function readPostRecord(post: Post): PostRecord | undefined {
  return AppBskyFeedPost.isRecord(post.record) ? (post.record as PostRecord) : undefined;
}
