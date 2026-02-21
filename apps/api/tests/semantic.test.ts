import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@lingbuzz/db/queries/select", () => {
  return {
    selectPaperByLingbuzzId: vi.fn(),
  };
});

import { selectPaperByLingbuzzId } from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import semanticRoute from "../src/routes/semantic";

const mockSelectPaper = vi.mocked(selectPaperByLingbuzzId);

const mockAI = { run: vi.fn() };
const mockVectorize = { query: vi.fn() };

function createApp() {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.env = { AI: mockAI, VECTORIZE: mockVectorize } as Record<string, unknown>;
    await next();
  });
  app.route("/", semanticRoute);
  return app;
}

const app = createApp();

describe("GET /semantic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 400 when q parameter is missing", async () => {
    const response = await app.request("http://localhost/");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Query parameter 'q' is required",
    });
    expect(mockAI.run).not.toHaveBeenCalled();
  });

  test("returns scored results with paper details on success", async () => {
    const fakeVector = Array.from({ length: 768 }, () => 0.1);
    mockAI.run.mockResolvedValueOnce({ data: [fakeVector] });
    mockVectorize.query.mockResolvedValueOnce({
      matches: [
        {
          id: "007234",
          score: 0.95,
          metadata: { title: "On Syntax" },
        },
      ],
    });
    mockSelectPaper.mockResolvedValueOnce({
      paperId: 123,
      lingbuzzId: "007234",
      paperTitle: "On Syntax",
    });

    const response = await app.request(
      "http://localhost/?q=syntax+of+relative+clauses"
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      query: "syntax of relative clauses",
      limit: 10,
      data: [
        {
          score: 0.95,
          lingbuzzId: "007234",
          title: "On Syntax",
          paper: {
            paperId: 123,
            lingbuzzId: "007234",
            paperTitle: "On Syntax",
          },
        },
      ],
    });
    expect(mockAI.run).toHaveBeenCalledWith("@cf/baai/bge-base-en-v1.5", {
      text: ["syntax of relative clauses"],
    });
    expect(mockVectorize.query).toHaveBeenCalledWith(fakeVector, {
      topK: 10,
      returnMetadata: "all",
    });
  });

  test("clamps limit to 1-50", async () => {
    const fakeVector = Array.from({ length: 768 }, () => 0.1);
    mockAI.run.mockResolvedValueOnce({ data: [fakeVector] });
    mockVectorize.query.mockResolvedValueOnce({ matches: [] });

    const response = await app.request("http://localhost/?q=test&limit=200");

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.limit).toBe(50);
    expect(mockVectorize.query).toHaveBeenCalledWith(fakeVector, {
      topK: 50,
      returnMetadata: "all",
    });
  });

  test("returns 500 when AI embedding fails", async () => {
    mockAI.run.mockRejectedValueOnce(new Error("AI service unavailable"));

    const response = await app.request("http://localhost/?q=test");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to perform semantic search",
    });
  });

  test("returns empty data array when no Vectorize matches", async () => {
    const fakeVector = Array.from({ length: 768 }, () => 0.1);
    mockAI.run.mockResolvedValueOnce({ data: [fakeVector] });
    mockVectorize.query.mockResolvedValueOnce({ matches: [] });

    const response = await app.request("http://localhost/?q=obscure+topic");

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toEqual([]);
  });
});
