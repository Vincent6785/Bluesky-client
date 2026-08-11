import type { $Typed, AppBskyEmbedImages } from "@atproto/api";
import { getAgent } from "@/api/agentService";
import type { StrongRef } from "@/models/post";
import { detectFacets } from "./richTextService";
import type { UploadedImage } from "./mediaService";

export type CreatePostInput = {
  text: string;
  replyTo?: { root: StrongRef; parent: StrongRef };
  images?: UploadedImage[];
};

function buildEmbed(
  images: UploadedImage[] | undefined,
): $Typed<AppBskyEmbedImages.Main> | undefined {
  if (!images?.length) return undefined;
  return {
    $type: "app.bsky.embed.images",
    images: images.map(({ blob, alt }) => ({ image: blob, alt })),
  };
}

export async function createPost(input: CreatePostInput): Promise<StrongRef> {
  const { text, facets } = await detectFacets(input.text);
  const embed = buildEmbed(input.images);
  return getAgent().post({
    text,
    facets,
    reply: input.replyTo,
    embed,
    createdAt: new Date().toISOString(),
  });
}

export async function deletePost(uri: string): Promise<void> {
  await getAgent().deletePost(uri);
}

export async function like(ref: StrongRef): Promise<StrongRef> {
  return getAgent().like(ref.uri, ref.cid);
}

/** @param likeUri the like record URI — read from `post.viewer.like`. */
export async function unlike(likeUri: string): Promise<void> {
  await getAgent().deleteLike(likeUri);
}

export async function repost(ref: StrongRef): Promise<StrongRef> {
  return getAgent().repost(ref.uri, ref.cid);
}

/** @param repostUri the repost record URI — read from `post.viewer.repost`. */
export async function unrepost(repostUri: string): Promise<void> {
  await getAgent().deleteRepost(repostUri);
}
