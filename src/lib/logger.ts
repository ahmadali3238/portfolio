type LogLevel = "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function formatMessage(
  level: LogLevel,
  scope: string,
  message: string,
  context?: LogContext,
) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${scope}]`;

  if (!context || Object.keys(context).length === 0) {
    return `${prefix} ${message}`;
  }

  const contextString = Object.entries(context)
    .map(([key, value]) => {
      let serialized: string;
      if (value instanceof Error) {
        serialized = value.message;
      } else if (typeof value === "object" && value !== null) {
        serialized = JSON.stringify(value);
      } else {
        serialized = String(value);
      }
      return `${key}=${serialized}`;
    })
    .join(" ");

  return `${prefix} ${message} | ${contextString}`;
}

function createLogger(scope: string) {
  return {
    info(message: string, context?: LogContext) {
      console.warn(formatMessage("info", scope, message, context));
    },

    warn(message: string, context?: LogContext) {
      console.warn(formatMessage("warn", scope, message, context));
    },

    error(message: string, context?: LogContext) {
      console.error(formatMessage("error", scope, message, context));
    },
  };
}

export const notificationLogger = createLogger("notifications");
export const adminLogger = createLogger("admin");

export { createLogger };
