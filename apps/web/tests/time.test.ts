import { describe, expect, test } from "vitest";
import { relativeTime } from "../src/lib/time";

describe("relativeTime", () => {
  test("returns 'just now' for a moment a few seconds ago", () => {
    const to = new Date("2026-07-14T12:00:30.000Z");
    const from = new Date("2026-07-14T12:00:00.000Z");

    expect(relativeTime(from, to)).toBe("just now");
  });

  test("returns singular hour for exactly one hour ago", () => {
    const to = new Date("2026-07-14T13:00:00.000Z");
    const from = new Date("2026-07-14T12:00:00.000Z");

    expect(relativeTime(from, to)).toBe("1 hour ago");
  });

  test("returns plural hours for a few hours ago", () => {
    const to = new Date("2026-07-14T15:00:00.000Z");
    const from = new Date("2026-07-14T12:00:00.000Z");

    expect(relativeTime(from, to)).toBe("3 hours ago");
  });

  test("returns singular day for exactly one day ago", () => {
    const to = new Date("2026-07-15T12:00:00.000Z");
    const from = new Date("2026-07-14T12:00:00.000Z");

    expect(relativeTime(from, to)).toBe("1 day ago");
  });

  test("returns plural days for a couple days ago", () => {
    const to = new Date("2026-07-16T12:00:00.000Z");
    const from = new Date("2026-07-14T12:00:00.000Z");

    expect(relativeTime(from, to)).toBe("2 days ago");
  });

  test("guards against a future date by returning 'just now'", () => {
    const to = new Date("2026-07-14T12:00:00.000Z");
    const from = new Date("2026-07-14T12:05:00.000Z");

    expect(relativeTime(from, to)).toBe("just now");
  });

  test("defaults 'to' to the current time when omitted", () => {
    const from = new Date(Date.now() - 1000 * 30);

    expect(relativeTime(from)).toBe("just now");
  });
});
