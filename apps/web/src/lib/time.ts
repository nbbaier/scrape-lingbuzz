const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Formats `from` relative to `to` (defaults to now) as a short human string,
 * e.g. "just now", "3 hours ago", "2 days ago".
 *
 * Guards against clock skew / future dates: any non-positive elapsed time
 * (including `from` being after `to`) is treated as "just now".
 */
export function relativeTime(from: Date, to: Date = new Date()): string {
  const elapsedMs = to.getTime() - from.getTime();

  if (elapsedMs < MINUTE_MS) {
    return "just now";
  }

  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
