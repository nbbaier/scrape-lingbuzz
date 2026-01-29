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
        const delay = baseDelayMs * 2 ** attempt;
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
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  }, maxRetries);
}
