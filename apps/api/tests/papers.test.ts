import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@lingbuzz/db/queries/select", () => ({
  selectPapers: vi.fn(),
  selectPaperByLingbuzzId: vi.fn(),
}));

import type { Db } from "@lingbuzz/db";
import {
  selectPaperByLingbuzzId,
  selectPapers,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import papersRoute from "../src/routes/papers";

const mockSelectPapers = vi.mocked(selectPapers);
const mockSelectPaperByLingbuzzId = vi.mocked(selectPaperByLingbuzzId);

const mockDb = {} as Db;

function createApp() {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("db", mockDb);
    await next();
  });
  app.route("/", papersRoute);
  return app;
}

const app = createApp();

describe("GET /papers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectPapers.mockResolvedValue([]);
    mockSelectPaperByLingbuzzId.mockResolvedValue(undefined);
  });

  test("defaults to limit 20 and offset 0", async () => {
    const response = await app.request("http://localhost/");

    expect(response.status).toBe(200);
    expect(mockSelectPapers).toHaveBeenCalledWith(mockDb, {
      limit: 20,
      offset: 0,
    });
    await expect(response.json()).resolves.toEqual({
      limit: 20,
      offset: 0,
      data: [],
    });
  });

  test("forwards limit and offset query params", async () => {
    const response = await app.request("http://localhost/?limit=50&offset=40");

    expect(response.status).toBe(200);
    expect(mockSelectPapers).toHaveBeenCalledWith(mockDb, {
      limit: 50,
      offset: 40,
    });
    await expect(response.json()).resolves.toEqual({
      limit: 50,
      offset: 40,
      data: [],
    });
  });

  test("caps offset at 10000", async () => {
    const response = await app.request("http://localhost/?offset=999999999");

    expect(response.status).toBe(200);
    expect(mockSelectPapers).toHaveBeenCalledWith(mockDb, {
      limit: 20,
      offset: 10_000,
    });
  });

  test("clamps negative offset to 0", async () => {
    const response = await app.request("http://localhost/?offset=-50");

    expect(response.status).toBe(200);
    expect(mockSelectPapers).toHaveBeenCalledWith(mockDb, {
      limit: 20,
      offset: 0,
    });
  });
});
