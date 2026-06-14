export type { AdminNotification } from "@/lib/supabase-rest";

export {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/supabase-rest";

import { createAdminNotification } from "@/lib/supabase-rest";
import { notificationLogger } from "@/lib/logger";

export async function createInAppNotification(notification: {
  type: string;
  title: string;
  message: string;
  severity: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    await createAdminNotification(notification);
    notificationLogger.info("In-app notification created", {
      type: notification.type,
      severity: notification.severity,
    });
    return true;
  } catch (error) {
    notificationLogger.error("Failed to create in-app notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
