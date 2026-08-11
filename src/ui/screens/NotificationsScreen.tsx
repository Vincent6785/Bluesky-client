import { useEffect } from "react";
import { listNotifications, markAllSeen } from "@/services/notificationsService";
import type { AppNotification } from "@/models/notification";
import { useAsync } from "@/ui/hooks/useAsync";
import { useNavigationStore } from "@/store/navigationStore";

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
    void markAllSeen();
  }, []);

  if (status === "loading") return <p className="centered-message">Loading notifications…</p>;
  if (status === "error") {
    return <p className="centered-message error-text">{error instanceof Error ? error.message : "Failed to load notifications"}</p>;
  }

  return (
    <div>
      {data.notifications.length === 0 && <p className="centered-message">No notifications yet.</p>}
      {data.notifications.map((n) => (
        <div
          key={n.uri}
          className="notification-item"
          data-unread={!n.isRead}
          onClick={() => {
            if (n.reason === "follow") push({ name: "profile", actor: n.author.did });
            else push({ name: "thread", uri: n.reasonSubject ?? n.uri });
          }}
        >
          <img className="avatar" src={n.author.avatar} alt="" />
          <div>
            <strong>{n.author.displayName || n.author.handle}</strong> {describe(n)}
          </div>
        </div>
      ))}
    </div>
  );
}
