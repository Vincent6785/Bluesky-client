import { useState } from "react";
import { AppBskyEmbedImages } from "@atproto/api";
import type { Post } from "@/models/post";
import { readPostRecord } from "@/models/post";
import { like, unlike, repost, unrepost, deletePost } from "@/services/postService";
import { useAuthStore } from "@/store/authStore";
import { useNavigationStore } from "@/store/navigationStore";
import { describeError } from "@/errors/describeError";
import { onLinkActivateKey } from "@/ui/a11y";
import { RichTextView } from "./RichTextView";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString();
}

export function PostCard({ post, onDeleted }: { post: Post; onDeleted?: () => void }) {
  const did = useAuthStore((s) => (s.auth.status === "signed-in" ? s.auth.did : undefined));
  const push = useNavigationStore((s) => s.push);
  const record = readPostRecord(post);
  const [viewer, setViewer] = useState(post.viewer);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  if (!record) return null;

  const isOwn = post.author.did === did;

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    setActionError(undefined);
    try {
      if (viewer?.like) {
        await unlike(viewer.like);
        setViewer((v) => {
          const { like: _like, ...rest } = v ?? {};
          return rest;
        });
      } else {
        const ref = await like({ uri: post.uri, cid: post.cid });
        setViewer((v) => ({ ...v, like: ref.uri }));
      }
    } catch (error) {
      setActionError(describeError(error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRepost() {
    if (busy) return;
    setBusy(true);
    setActionError(undefined);
    try {
      if (viewer?.repost) {
        await unrepost(viewer.repost);
        setViewer((v) => {
          const { repost: _repost, ...rest } = v ?? {};
          return rest;
        });
      } else {
        const ref = await repost({ uri: post.uri, cid: post.cid });
        setViewer((v) => ({ ...v, repost: ref.uri }));
      }
    } catch (error) {
      setActionError(describeError(error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (busy || !window.confirm("Delete this post?")) return;
    setBusy(true);
    setActionError(undefined);
    try {
      await deletePost(post.uri);
      onDeleted?.();
    } catch (error) {
      setActionError(describeError(error).message);
    } finally {
      setBusy(false);
    }
  }

  const images = AppBskyEmbedImages.isView(post.embed) ? post.embed.images : undefined;

  function goToProfile(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    push({ name: "profile", actor: post.author.did });
  }

  return (
    <article
      className="post-card"
      onClick={() => push({ name: "thread", uri: post.uri })}
      onKeyDown={onLinkActivateKey(() => push({ name: "thread", uri: post.uri }))}
      role="link"
      tabIndex={0}
    >
      {/* Mouse-only shortcut to the same destination as .post-author-line below,
          which is the keyboard/screen-reader-accessible route there — avoiding
          a second, redundant focusable stop for the identical link. */}
      <div className="post-author-avatar-line" onClick={goToProfile}>
        <img className="avatar" src={post.author.avatar} alt="" />
      </div>
      <div className="post-body">
        <div
          className="post-author-line"
          role="link"
          tabIndex={0}
          aria-label={`${post.author.displayName || post.author.handle}'s profile`}
          onClick={goToProfile}
          onKeyDown={onLinkActivateKey(() => push({ name: "profile", actor: post.author.did }))}
        >
          <span className="display-name">{post.author.displayName || post.author.handle}</span>
          <span className="handle">@{post.author.handle}</span>
          <span className="timestamp">· {formatTimestamp(record.createdAt)}</span>
        </div>
        <RichTextView text={record.text} facets={record.facets} />
        {images && images.length > 0 && (
          <div className="post-images">
            {images.map((img) => (
              <img key={img.thumb} src={img.thumb} alt={img.alt} />
            ))}
          </div>
        )}
        <div className="post-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="View replies" onClick={() => push({ name: "thread", uri: post.uri })}>
            💬 {post.replyCount ?? 0}
          </button>
          <button
            type="button"
            data-kind="repost"
            data-active={Boolean(viewer?.repost)}
            aria-label={viewer?.repost ? "Undo repost" : "Repost"}
            aria-pressed={Boolean(viewer?.repost)}
            onClick={toggleRepost}
            disabled={busy}
          >
            🔁 {post.repostCount ?? 0}
          </button>
          <button
            type="button"
            data-kind="like"
            data-active={Boolean(viewer?.like)}
            aria-label={viewer?.like ? "Unlike" : "Like"}
            aria-pressed={Boolean(viewer?.like)}
            onClick={toggleLike}
            disabled={busy}
          >
            {viewer?.like ? "❤️" : "🤍"} {post.likeCount ?? 0}
          </button>
          {isOwn && (
            <button type="button" aria-label="Delete post" onClick={onDelete} disabled={busy}>
              🗑️
            </button>
          )}
        </div>
        {actionError && <p className="error-text">{actionError}</p>}
      </div>
    </article>
  );
}
