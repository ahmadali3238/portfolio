import { sendAdminEmail } from "@/lib/notifications/email";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { notificationLogger } from "@/lib/logger";

interface AdminAlertPayload {
  type: "generation_failed" | "image_failed" | "system_alert";
  title: string;
  message: string;
  severity: "warning" | "error";
  metadata?: Record<string, unknown>;
}

export async function dispatchAdminAlert(payload: AdminAlertPayload): Promise<void> {
  try {
    const [emailResult, inAppResult] = await Promise.allSettled([
      sendAdminEmail({
        subject: payload.title,
        body: payload.message,
        severity: payload.severity,
      }),
      createInAppNotification({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        severity: payload.severity,
        metadata: payload.metadata,
      }),
    ]);

    if (emailResult.status === "rejected") {
      notificationLogger.error("Email dispatch failed", {
        error:
          emailResult.reason instanceof Error
            ? emailResult.reason.message
            : String(emailResult.reason),
      });
    }

    if (inAppResult.status === "rejected") {
      notificationLogger.error("In-app notification dispatch failed", {
        error:
          inAppResult.reason instanceof Error
            ? inAppResult.reason.message
            : String(inAppResult.reason),
      });
    }
  } catch (error) {
    notificationLogger.error("Notification dispatcher crashed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
