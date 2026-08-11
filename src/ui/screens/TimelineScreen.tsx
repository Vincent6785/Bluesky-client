import { useState } from "react";
import { getTimeline } from "@/services/timelineService";
import { useAsync } from "@/ui/hooks/useAsync";
import { Composer } from "@/ui/components/Composer";
import { PostCard } from "@/ui/components/PostCard";
import { describeError } from "@/errors/describeError";

export function TimelineScreen() {
  const [refreshToken, setRefreshToken] = useState(0);
  const { status, data, error, reload } = useAsync(() => getTimeline(), [refreshToken]);

  return (
    <div>
      <Composer
        onPosted={() => {
          setRefreshToken((n) => n + 1);
        }}
      />
      {status === "loading" && <p className="centered-message">Loading timeline…</p>}
      {status === "error" && (
        <p className="centered-message error-text">{describeError(error).message}</p>
      )}
      {status === "success" &&
        data.feed.map((item) => <PostCard key={item.post.uri} post={item.post} onDeleted={reload} />)}
    </div>
  );
}
