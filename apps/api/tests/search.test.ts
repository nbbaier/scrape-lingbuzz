import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@lingbuzz/db/queries/search", () => {
  class SearchSyntaxError extends Error {
    query: string;

    constructor(query: string, cause?: unknown) {
      super("Invalid full-text search syntax", { cause });
      this.name = "SearchSyntaxError";
      this.query = query;
    }
  }

  return {
    SearchSyntaxError,
    searchPapers: vi.fn(),
    searchPapersCount: vi.fn(),
  };
});

import {
  SearchSyntaxError,
  searchPapers,
  searchPapersCount,
} from "@lingbuzz/db/queries/search";
import searchRoute from "../src/routes/search";

const mockSearchPapers = vi.mocked(searchPapers);
const mockSearchPapersCount = vi.mocked(searchPapersCount);

describe("GET /search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPapers.mockResolvedValue([]);
    mockSearchPapersCount.mockResolvedValue(0);
  });

  test("returns 400 when query parameter is missing", async () => {
    const response = await searchRoute.request("http://localhost/");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Query parameter 'q' is required",
    });
    expect(mockSearchPapers).not.toHaveBeenCalled();
    expect(mockSearchPapersCount).not.toHaveBeenCalled();
  });

  test("returns 400 for invalid field values", async () => {
    const response = await searchRoute.request(
      "http://localhost/?q=syntax&field=downloads"
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Invalid field. Must be one of: all, title, abstract, keywords, authors",
    });
    expect(mockSearchPapers).not.toHaveBeenCalled();
  });

  test("normalizes pagination and forwards field-scoped search args", async () => {
    const data = [
      {
        paperId: 123,
        lingbuzzId: "007234",
        title: "On the syntax of...",
        abstract: "This paper argues...",
        snippet: "...the <mark>syntax</mark> of relative clauses...",
        rank: -4.23,
      },
    ];
    mockSearchPapers.mockResolvedValueOnce(data);
    mockSearchPapersCount.mockResolvedValueOnce(142);

    const response = await searchRoute.request(
      "http://localhost/?q=syntax%20OR%20morphology&field=title&limit=500&offset=-10"
    );

    expect(response.status).toBe(200);
    expect(mockSearchPapers).toHaveBeenCalledWith({
      query: "syntax OR morphology",
      field: "title",
      limit: 100,
      offset: 0,
    });
    expect(mockSearchPapersCount).toHaveBeenCalledWith({
      query: "syntax OR morphology",
      field: "title",
    });

    await expect(response.json()).resolves.toEqual({
      query: "syntax OR morphology",
      field: "title",
      total: 142,
      limit: 100,
      offset: 0,
      data,
    });
  });

  test("returns 400 when query syntax is invalid", async () => {
    mockSearchPapers.mockRejectedValueOnce(new SearchSyntaxError('"'));

    const response = await searchRoute.request("http://localhost/?q=%22");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid search query syntax",
    });
  });

  test("returns 500 for unexpected failures", async () => {
    mockSearchPapers.mockRejectedValueOnce(new Error("database down"));

    const response = await searchRoute.request("http://localhost/?q=syntax");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to search papers",
    });
  });
});
