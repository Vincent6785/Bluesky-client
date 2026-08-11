import { useRef, useState } from "react";
import { RichText } from "@atproto/api";
import { createPost } from "@/services/postService";
import { uploadImage, type UploadedImage } from "@/services/mediaService";
import type { StrongRef } from "@/models/post";

const MAX_GRAPHEMES = 300;
const MAX_IMAGES = 4;

export function Composer({
  replyTo,
  onPosted,
}: {
  replyTo?: { root: StrongRef; parent: StrongRef };
  onPosted?: () => void;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const length = new RichText({ text }).graphemeLength;
  const over = length > MAX_GRAPHEMES;
  const canPost = (text.trim().length > 0 || images.length > 0) && !over && !posting && !uploading;

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(undefined);
    setUploading(true);
    try {
      const remaining = MAX_IMAGES - images.length;
      const files = Array.from(fileList).slice(0, remaining);
      const uploaded = await Promise.all(files.map((file) => uploadImage(file, "")));
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit() {
    setError(undefined);
    setPosting(true);
    try {
      await createPost({ text, replyTo, images });
      setText("");
      setImages([]);
      onPosted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="composer">
      <textarea
        placeholder={replyTo ? "Post your reply" : "What's happening?"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={Boolean(replyTo)}
      />
      {images.length > 0 && (
        <div className="post-images">
          {images.map((img, i) => (
            <div key={i}>
              <input
                placeholder="Alt text"
                value={img.alt}
                onChange={(e) =>
                  setImages((prev) => prev.map((im, idx) => (idx === i ? { ...im, alt: e.target.value } : im)))
                }
              />
              <button type="button" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <div className="composer-footer">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <button
            type="button"
            className="icon-button"
            disabled={uploading || images.length >= MAX_IMAGES}
            onClick={() => fileInputRef.current?.click()}
          >
            🖼️
          </button>
          <span className="composer-count" data-over={over}>
            {length}/{MAX_GRAPHEMES}
          </span>
        </div>
        <button type="button" className="primary-button" disabled={!canPost} onClick={submit}>
          {posting ? "Posting…" : replyTo ? "Reply" : "Post"}
        </button>
      </div>
    </div>
  );
}
