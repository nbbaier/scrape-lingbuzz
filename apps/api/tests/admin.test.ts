import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@lingbuzz/db/queries/select", () => {
  return {
    selectUnembeddedPapers: vi.fn(),
    markPapersEmbedded: vi.fn(),
  };
});

import {
  markPapersEmbedded,
  selectUnembeddedPapers,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import adminRoute from "../src/routes/admin";

const mockSelectUnembedded = vi.mocked(selectUnembeddedPapers);
const mockMarkEmbedded = vi.mocked(markPapersEmbedded);

const mockAI = { run: vi.fn() };
const mockVectorize = { upsert: vi.fn() };
const TEST_TOKEN = "test-token";

function createApp() {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.env = {
      AI: mockAI,
      VECTORIZE: mockVectorize,
      ADMIN_TOKEN: TEST_TOKEN,
    } as Record<string, unknown>;
    await next();
  });
  app.route("/", adminRoute);
  return app;
}

const app = createApp();

describe("POST /embed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 when no auth token provided", async () => {
    const response = await app.request("http://localhost/embed", {
      method: "POST",
    });

    expect(response.status).toBe(401);
  });

  test("returns 401 when wrong auth token provided", async () => {
    const response = await app.request("http://localhost/embed", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-token" },
    });

    expect(response.status).toBe(401);
  });

  test("returns embedded 0 and remaining 0 when nothing to embed", async () => {
    mockSelectUnembedded.mockResolvedValueOnce([]);

    const response = await app.request("http://localhost/embed", {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      embedded: 0,
      remaining: 0,
    });
  });

  test("embeds batch and returns count", async () => {
    const papers = [
      {
        paperId: 1,
        lingbuzzId: "000001",
        paperTitle: "Paper One",
        abstract: "Abstract one",
      },
      {
        paperId: 2,
        lingbuzzId: "000002",
        paperTitle: "Paper Two",
        abstract: "Abstract two",
      },
    ];
    mockSelectUnembedded.mockResolvedValueOnce(papers);
    mockAI.run.mockResolvedValueOnce({
      data: [
        Array.from({ length: 768 }, () => 0.1),
        Array.from({ length: 768 }, () => 0.2),
      ],
    });
    mockVectorize.upsert.mockResolvedValueOnce(undefined);
    mockMarkEmbedded.mockResolvedValueOnce(undefined);
    mockSelectUnembedded.mockResolvedValueOnce([]);

    const response = await app.request("http://localhost/embed", {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      embedded: 2,
      remaining: 0,
    });
  });

  test("handles AI errors gracefully and continues", async () => {
    const papers = Array.from({ length: 150 }, (_, i) => ({
      paperId: i + 1,
      lingbuzzId: String(i + 1).padStart(6, "0"),
      paperTitle: `Paper ${i + 1}`,
      abstract: `Abstract ${i + 1}`,
    }));
    mockSelectUnembedded.mockResolvedValueOnce(papers);

    // First batch of 100 fails
    mockAI.run.mockRejectedValueOnce(new Error("AI overloaded"));

    // Second batch of 50 succeeds
    mockAI.run.mockResolvedValueOnce({
      data: Array.from({ length: 50 }, () =>
        Array.from({ length: 768 }, () => 0.1)
      ),
    });
    mockVectorize.upsert.mockResolvedValueOnce(undefined);
    mockMarkEmbedded.mockResolvedValueOnce(undefined);

    // Remaining check
    mockSelectUnembedded.mockResolvedValueOnce([{ paperId: 999 }]);

    const response = await app.request("http://localhost/embed", {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.embedded).toBe(50);
    expect(json.remaining).toBe(100);
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]).toContain("Batch 0");
  });

  test("calls markPapersEmbedded with correct paper IDs", async () => {
    const papers = [
      {
        paperId: 10,
        lingbuzzId: "000010",
        paperTitle: "Paper Ten",
        abstract: "Abstract ten",
      },
      {
        paperId: 20,
        lingbuzzId: "000020",
        paperTitle: "Paper Twenty",
        abstract: "Abstract twenty",
      },
    ];
    mockSelectUnembedded.mockResolvedValueOnce(papers);
    mockAI.run.mockResolvedValueOnce({
      data: [
        Array.from({ length: 768 }, () => 0.1),
        Array.from({ length: 768 }, () => 0.2),
      ],
    });
    mockVectorize.upsert.mockResolvedValueOnce(undefined);
    mockMarkEmbedded.mockResolvedValueOnce(undefined);
    mockSelectUnembedded.mockResolvedValueOnce([]);

    await app.request("http://localhost/embed", {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(mockMarkEmbedded).toHaveBeenCalledWith([10, 20]);
  });
});
