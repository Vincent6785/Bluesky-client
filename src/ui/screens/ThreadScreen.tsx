import { getPostThread } from "@/services/threadService";
import { useAsync } from "@/ui/hooks/useAsync";
import { Composer } from "@/ui/components/Composer";
import { PostCard } from "@/ui/components/PostCard";
import type { ThreadNode } from "@/models/post";
import { useNavigationStore } from "@/store/navigationStore";
import { describeError } from "@/errors/describeError";
import { onLinkActivateKey } from "@/ui/a11y";

function isThreadPost(node: unknown): node is ThreadNode {
  return Boolean(node) && (node as { $type?: string }).$type === "app.bsky.feed.defs#threadViewPost";
}

function ancestorsOf(node: ThreadNode): ThreadNode[] {
  const chain: ThreadNode[] = [];
  let cursor: unknown = node.parent;
  while (isThreadPost(cursor)) {
    chain.unshift(cursor);
    cursor = cursor.parent;
  }
  return chain;
}

export function ThreadScreen({ uri }: { uri: string }) {
  const push = useNavigationStore((s) => s.push);
  const { status, data, error, reload } = useAsync(() => getPostThread(uri), [uri]);

  if (status === "loading") return <p className="centered-message">Loading thread…</p>;
  if (status === "error") {
    return <p className="centered-message error-text">{describeError(error).message}</p>;
  }

  if (!isThreadPost(data)) {
    return <p className="centered-message">This post is unavailable.</p>;
  }

  const ancestors = ancestorsOf(data);
  const replies: ThreadNode[] = (data.replies ?? []).filter((r): r is ThreadNode => isThreadPost(r));
  const rootRef = ancestors[0] ?? data;

  return (
    <div>
      {ancestors.map((node) => (
        <div
          key={node.post.uri}
          className="thread-parent-link"
          role="link"
          tabIndex={0}
          onClick={() => push({ name: "thread", uri: node.post.uri })}
          onKeyDown={onLinkActivateKey(() => push({ name: "thread", uri: node.post.uri }))}
        >
          ↑ In reply to @{node.post.author.handle}
        </div>
      ))}
      <PostCard post={data.post} onDeleted={reload} />
      <Composer
        replyTo={{
          root: { uri: rootRef.post.uri, cid: rootRef.post.cid },
          parent: { uri: data.post.uri, cid: data.post.cid },
        }}
        onPosted={reload}
      />
      {replies.map((reply) => (
        <PostCard key={reply.post.uri} post={reply.post} onDeleted={reload} />
      ))}
    </div>
  );
}
