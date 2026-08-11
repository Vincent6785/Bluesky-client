import { getAgent } from "@/api/agentService";
import type { ProfileDetailed } from "@/models/profile";
import type { StrongRef } from "@/models/post";

export async function getProfile(actor: string): Promise<ProfileDetailed> {
  const { data } = await getAgent().getProfile({ actor });
  return data;
}

/** Follows an actor by DID. Returns the follow record's ref, needed later to unfollow. */
export async function follow(did: string): Promise<StrongRef> {
  return getAgent().follow(did);
}

/** @param followUri the follow record URI — read from `profile.viewer.following`. */
export async function unfollow(followUri: string): Promise<void> {
  await getAgent().deleteFollow(followUri);
}
