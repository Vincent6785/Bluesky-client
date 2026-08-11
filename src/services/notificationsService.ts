import { getAgent } from "@/api/agentService";
import type { AppNotification } from "@/models/notification";

export type NotificationsPage = {
  notifications: AppNotification[];
  cursor?: string;
};

export async function listNotifications(cursor?: string): Promise<NotificationsPage> {
  const { data } = await getAgent().listNotifications({ cursor });
  return { notifications: data.notifications, cursor: data.cursor };
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await getAgent().countUnreadNotifications();
  return data.count;
}

export async function markAllSeen(): Promise<void> {
  await getAgent().updateSeenNotifications();
}
