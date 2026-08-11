import { useEffect } from "react";
import { listNotifications, markAllSeen } from "@/services/notificationsService";
import type { AppNotification } from "@/models/notification";
import { useAsync } from "@/ui/hooks/useAsync";
import { useNavigationStore } from "@/store/navigationStore";
import { describeError } from "@/errors/describeError";
import { onLinkActivateKey } from "@/ui/a11y";

const REASON_LABEL: Record<string, string> = {
  like: "liked your post",
  repost: "reposted your post",
  follow: "followed you",
  mention: "mentioned you",
  reply: "replied to you",
  quote: "quoted your post",
};

function describe(n: AppNotification): string {
  return REASON_LABEL[n.reason] ?? n.reason;
}

export function NotificationsScreen() {
  const push = useNavigationStore((s) => s.push);
  const { status, data, error } = useAsync(() => listNotifications(), []);

  useEffect(() => {
    // Best-effort: failing to mark notifications as seen isn't worth
    // interrupting the user over. Failures are still visible in the network
    // debug log (src/network/loggingFetch.ts) if something's actually wrong.
    markAllSeen().catch(() => {});
  }, []);

  if (status === "loading") return <p className="centered-message">Loading notifications…</p>;
  if (status === "error") {
    return <p className="centered-message error-text">{describeError(error).message}</p>;
  }

  return (
    <div>
      {data.notifications.length === 0 && <p className="centered-message">No notifications yet.</p>}
      {data.notifications.map((n) => {
        const activate = () => {
          if (n.reason === "follow") push({ name: "profile", actor: n.author.did });
          else push({ name: "thread", uri: n.reasonSubject ?? n.uri });
        };
        return (
          <div
            key={n.uri}
            className="notification-item"
            data-unread={!n.isRead}
            role="link"
            tabIndex={0}
            onClick={activate}
            onKeyDown={onLinkActivateKey(activate)}
          >
            <img className="avatar" src={n.author.avatar} alt="" />
            <div>
              <strong>{n.author.displayName || n.author.handle}</strong> {describe(n)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
