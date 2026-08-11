import { getAgent } from "@/api/agentService";
import type { ThreadNode, NotFoundPost, BlockedPost } from "@/models/post";

export type ThreadResult = ThreadNode | NotFoundPost | BlockedPost;

export async function getPostThread(uri: string, depth = 10): Promise<ThreadResult> {
  const { data } = await getAgent().getPostThread({ uri, depth });
  return data.thread as ThreadResult;
}
