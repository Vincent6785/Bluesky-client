import { getAgent } from "@/api/agentService";
import type { Profile } from "@/models/profile";
import type { Post } from "@/models/post";

export type ActorSearchPage = {
  actors: Profile[];
  cursor?: string;
};

export async function searchUsers(query: string, cursor?: string): Promise<ActorSearchPage> {
  const { data } = await getAgent().searchActors({ q: query, cursor });
  return { actors: data.actors, cursor: data.cursor };
}

export type PostSearchPage = {
  posts: Post[];
  cursor?: string;
};

export async function searchPosts(query: string, cursor?: string): Promise<PostSearchPage> {
  const { data } = await getAgent().app.bsky.feed.searchPosts({ q: query, cursor });
  return { posts: data.posts, cursor: data.cursor };
}
