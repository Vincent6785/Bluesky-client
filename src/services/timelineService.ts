import { getAgent } from "@/api/agentService";
import type { FeedItem } from "@/models/post";

export type FeedPage = {
  feed: FeedItem[];
  cursor?: string;
};

export async function getTimeline(params?: { cursor?: string; limit?: number }): Promise<FeedPage> {
  const { data } = await getAgent().getTimeline({ cursor: params?.cursor, limit: params?.limit ?? 30 });
  return { feed: data.feed, cursor: data.cursor };
}

export async function getAuthorFeed(actor: string, params?: { cursor?: string; limit?: number }): Promise<FeedPage> {
  const { data } = await getAgent().getAuthorFeed({
    actor,
    cursor: params?.cursor,
    limit: params?.limit ?? 30,
  });
  return { feed: data.feed, cursor: data.cursor };
}
