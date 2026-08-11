import { useState } from "react";
import { getProfile, follow, unfollow } from "@/services/profileService";
import { getAuthorFeed } from "@/services/timelineService";
import { useAsync } from "@/ui/hooks/useAsync";
import { PostCard } from "@/ui/components/PostCard";
import { useAuthStore } from "@/store/authStore";
import { describeError } from "@/errors/describeError";

export function ProfileScreen({ actor }: { actor: string }) {
  const myDid = useAuthStore((s) => (s.auth.status === "signed-in" ? s.auth.did : undefined));
  const profileState = useAsync(() => getProfile(actor), [actor]);
  const feedState = useAsync(() => getAuthorFeed(actor), [actor]);
  const [followUri, setFollowUri] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [followError, setFollowError] = useState<string | undefined>();

  const profile = profileState.status === "success" ? profileState.data : undefined;
  const currentFollowUri = followUri !== undefined ? followUri : profile?.viewer?.following;

  async function toggleFollow() {
    if (!profile || busy) return;
    setBusy(true);
    setFollowError(undefined);
    try {
      if (currentFollowUri) {
        await unfollow(currentFollowUri);
        setFollowUri("");
      } else {
        const ref = await follow(profile.did);
        setFollowUri(ref.uri);
      }
    } catch (error) {
      setFollowError(describeError(error).message);
    } finally {
      setBusy(false);
    }
  }

  if (profileState.status === "loading") return <p className="centered-message">Loading profile…</p>;
  if (profileState.status === "error" || !profile) {
    return <p className="centered-message error-text">{describeError(profileState.error).message}</p>;
  }

  const isSelf = profile.did === myDid;

  return (
    <div>
      <div className="profile-header">
        <div className="profile-header-top">
          <img className="avatar" src={profile.avatar} alt="" />
          {!isSelf && (
            <button type="button" className="primary-button" onClick={toggleFollow} disabled={busy}>
              {currentFollowUri ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {followError && <p className="error-text">{followError}</p>}
        <div className="display-name">{profile.displayName || profile.handle}</div>
        <div className="handle">@{profile.handle}</div>
        {profile.description && <p className="profile-bio">{profile.description}</p>}
        <p>
          <strong>{profile.followsCount ?? 0}</strong> following ·{" "}
          <strong>{profile.followersCount ?? 0}</strong> followers
        </p>
      </div>
      {feedState.status === "success" &&
        feedState.data.feed.map((item) => (
          <PostCard key={item.post.uri} post={item.post} onDeleted={feedState.reload} />
        ))}
    </div>
  );
}
