import type { BlobRef } from "@atproto/api";
import { getAgent } from "@/api/agentService";

export const MAX_IMAGE_BYTES = 1_000_000; // Bluesky PDS-enforced limit for app.bsky.embed.images blobs.

export type UploadedImage = {
  blob: BlobRef;
  alt: string;
};

/** Uploads a single image to the user's own PDS as a blob. Does not attach it to any post yet. */
export async function uploadImage(file: File, alt: string): Promise<UploadedImage> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds the ${MAX_IMAGE_BYTES.toLocaleString()} byte limit`);
  }
  const { data } = await getAgent().uploadBlob(file, { encoding: file.type });
  return { blob: data.blob, alt };
}
