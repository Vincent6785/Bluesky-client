import type { AppBskyNotificationListNotifications } from "@atproto/api";

export type AppNotification = AppBskyNotificationListNotifications.Notification;
export type NotificationReason = AppNotification["reason"];
