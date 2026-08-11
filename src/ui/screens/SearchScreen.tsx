import { useState } from "react";
import { searchUsers, searchPosts } from "@/services/searchService";
import { useAsync } from "@/ui/hooks/useAsync";
import { PostCard } from "@/ui/components/PostCard";
import { useNavigationStore } from "@/store/navigationStore";

export function SearchScreen() {
  const push = useNavigationStore((s) => s.push);
  const [tab, setTab] = useState<"users" | "posts">("users");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const usersState = useAsync(
    () => (submittedQuery && tab === "users" ? searchUsers(submittedQuery) : Promise.resolve({ actors: [] })),
    [submittedQuery, tab],
  );
  const postsState = useAsync(
    () => (submittedQuery && tab === "posts" ? searchPosts(submittedQuery) : Promise.resolve({ posts: [] })),
    [submittedQuery, tab],
  );

  return (
    <div>
      <div className="search-input-row">
        <input
          type="search"
          placeholder="Search Bluesky"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSubmittedQuery(query.trim());
          }}
        />
        <button type="button" className="primary-button" onClick={() => setSubmittedQuery(query.trim())}>
          Search
        </button>
      </div>
      <div className="search-tabs">
        <button type="button" aria-current={tab === "users"} onClick={() => setTab("users")}>
          People
        </button>
        <button type="button" aria-current={tab === "posts"} onClick={() => setTab("posts")}>
          Posts
        </button>
      </div>
      {tab === "users" &&
        usersState.status === "success" &&
        usersState.data.actors.map((actor) => (
          <div key={actor.did} className="actor-row" onClick={() => push({ name: "profile", actor: actor.did })}>
            <img className="avatar" src={actor.avatar} alt="" />
            <div className="actor-meta">
              <div className="display-name">{actor.displayName || actor.handle}</div>
              <div className="handle">@{actor.handle}</div>
            </div>
          </div>
        ))}
      {tab === "posts" &&
        postsState.status === "success" &&
        postsState.data.posts.map((post) => <PostCard key={post.uri} post={post} />)}
    </div>
  );
}
