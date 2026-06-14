import { notificationLogger } from "@/lib/logger";

interface AdminEmailPayload {
  subject: string;
  body: string;
  severity: "info" | "warning" | "error";
}

function hasEmailConfig() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.ADMIN_EMAIL &&
      process.env.RESEND_FROM_EMAIL,
  );
}

function getSeverityLabel(severity: string) {
  switch (severity) {
    case "error":
      return "ALERT";
    case "warning":
      return "WARNING";
    default:
      return "INFO";
  }
}

function buildHtmlBody(payload: AdminEmailPayload) {
  let severityColor = "#2563eb";
  if (payload.severity === "error") severityColor = "#dc2626";
  else if (payload.severity === "warning") severityColor = "#d97706";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a1a; max-width: 600px;">
  <div style="border-left: 4px solid ${severityColor}; padding: 16px 20px; background: #fafafa; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${severityColor}; font-weight: 600; margin-bottom: 8px;">
      ${getSeverityLabel(payload.severity)} &mdash; Blog Engine
    </div>
    <div style="font-size: 18px; font-weight: 600; line-height: 1.4;">
      ${payload.subject}
    </div>
  </div>
  <div style="font-size: 14px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${payload.body}</div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <div style="font-size: 11px; color: #9ca3af;">
    Sent by the Portfolio Blog Engine at ${new Date().toISOString()}
  </div>
</body>
</html>`.trim();
}

export async function sendAdminEmail(payload: AdminEmailPayload): Promise<boolean> {
  if (!hasEmailConfig()) {
    notificationLogger.warn("Email notification skipped (not configured)");
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.RESEND_FROM_EMAIL!;
  const to = process.env.ADMIN_EMAIL!;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from,
      to,
      subject: `[${getSeverityLabel(payload.severity)}] ${payload.subject}`,
      html: buildHtmlBody(payload),
    });

    if (error) {
      notificationLogger.error("Resend API returned an error", {
        error: error.message,
      });
      return false;
    }

    notificationLogger.info("Admin email sent", { to, subject: payload.subject });
    return true;
  } catch (error) {
    notificationLogger.error("Failed to send admin email", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
