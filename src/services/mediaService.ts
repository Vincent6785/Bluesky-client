import type { BlobRef } from "@atproto/api";
import { getAgent } from "@/api/agentService";

// app.bsky.embed.images#image's `image` blob field: "May be up to 2 MB,
// formerly limited to 1 MB" — per the lexicon shipped in @atproto/api
// (client/lexicons.js). Keep this in sync if that lexicon changes.
export const MAX_IMAGE_BYTES = 2_000_000;

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
