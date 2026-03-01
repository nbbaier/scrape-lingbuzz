import { MAX_RETRIES, RETRY_BASE_DELAY_MS } from "../constants";
import { logger } from "./logger";

/**
 * Wraps an async function with retry logic using exponential backoff.
 *
 * @param fn - The async function to retry.
 * @param maxRetries - Maximum number of retry attempts (default: MAX_RETRIES from constants).
 * @param baseDelayMs - Base delay in milliseconds before first retry (default: RETRY_BASE_DELAY_MS from constants).
 * @returns A promise that resolves with the function result or rejects after all retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  baseDelayMs = RETRY_BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        let delay = baseDelayMs * 2 ** attempt;

        // Add jitter (±20%)
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        delay = Math.max(0, Math.floor(delay + jitter));

        // Respect Retry-After if present in the error
        if (error && typeof error === "object" && "retryAfterMs" in error) {
          delay = (error as { retryAfterMs: number }).retryAfterMs;
        }

        logger.info(
          `Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Fetches a URL with automatic retry on failure.
 *
 * @param url - The URL to fetch.
 * @param options - Optional fetch options.
 * @param maxRetries - Maximum number of retry attempts (default: MAX_RETRIES from constants).
 * @returns A promise that resolves to the Response.
 */
export function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const error = new Error("HTTP 429: Too Many Requests");
        if (retryAfter) {
          const seconds = Number.parseInt(retryAfter, 10);
          if (!Number.isNaN(seconds)) {
            (error as any).retryAfterMs = seconds * 1000;
          }
        }
        throw error;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  }, maxRetries);
}
