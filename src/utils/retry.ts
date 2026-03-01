import {
  FETCH_TIMEOUT_MS,
  MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
} from "../constants";
import { logger } from "./logger";

class RetryAfterError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Wraps an async function with retry logic using exponential backoff with jitter.
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
        let delay: number;

        if (error instanceof RetryAfterError) {
          delay = error.retryAfterMs;
        } else {
          const baseDelay = baseDelayMs * 2 ** attempt;
          const jitter = baseDelay * 0.2 * (2 * Math.random() - 1);
          delay = baseDelay + jitter;
        }

        logger.info(
          `Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Fetches a URL with automatic retry on failure, timeout via AbortController,
 * and HTTP 429 handling with Retry-After support.
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retryMs = retryAfter
          ? Number.parseInt(retryAfter, 10) * 1000
          : RETRY_BASE_DELAY_MS;
        throw new RetryAfterError("HTTP 429: Too Many Requests", retryMs);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }, maxRetries);
}
