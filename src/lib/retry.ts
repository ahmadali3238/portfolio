import { createLogger } from "@/lib/logger";

const retryLogger = createLogger("retry");

interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  label: string;
  shouldRetry?: (error: unknown) => boolean;
}

function getJitteredDelay(baseDelayMs: number, attempt: number) {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * exponentialDelay * 0.3;
  return Math.min(exponentialDelay + jitter, 30_000);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, label, shouldRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const isLastAttempt = attempt === maxAttempts - 1;

      if (isLastAttempt) {
        break;
      }

      if (shouldRetry && !shouldRetry(error)) {
        break;
      }

      const delay = getJitteredDelay(baseDelayMs, attempt);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      retryLogger.warn(
        `Retrying ${label} (attempt ${attempt + 2}/${maxAttempts})`,
        { error: errorMessage, delayMs: Math.round(delay) },
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
