import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { fetchWithRetry, withRetry } from "../utils/retry";

describe("withRetry", () => {
	test("returns result on first successful attempt", async () => {
		const fn = mock(() => Promise.resolve("success"));
		const result = await withRetry(fn, 3, 10);
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test("retries on failure and eventually succeeds", async () => {
		let attempts = 0;
		const fn = mock(() => {
			attempts++;
			if (attempts < 3) {
				return Promise.reject(new Error("fail"));
			}
			return Promise.resolve("success");
		});

		const result = await withRetry(fn, 3, 10);
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(3);
	});

	test("throws after max retries exceeded", async () => {
		const fn = mock(() => Promise.reject(new Error("persistent failure")));

		await expect(withRetry(fn, 2, 10)).rejects.toThrow("persistent failure");
		expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
	});

	test("respects maxRetries parameter", async () => {
		const fn = mock(() => Promise.reject(new Error("fail")));

		await expect(withRetry(fn, 0, 10)).rejects.toThrow("fail");
		expect(fn).toHaveBeenCalledTimes(1); // no retries when maxRetries is 0
	});

	test("preserves error type", async () => {
		class CustomError extends Error {
			code: string;
			constructor(message: string, code: string) {
				super(message);
				this.code = code;
			}
		}

		const fn = mock(() => Promise.reject(new CustomError("custom", "ERR_001")));

		try {
			await withRetry(fn, 1, 10);
		} catch (e) {
			expect(e).toBeInstanceOf(CustomError);
			expect((e as CustomError).code).toBe("ERR_001");
		}
	});

	test("works with async functions returning different types", async () => {
		const numberFn = mock(() => Promise.resolve(42));
		const arrayFn = mock(() => Promise.resolve([1, 2, 3]));
		const objectFn = mock(() => Promise.resolve({ key: "value" }));

		expect(await withRetry(numberFn, 1, 10)).toBe(42);
		expect(await withRetry(arrayFn, 1, 10)).toEqual([1, 2, 3]);
		expect(await withRetry(objectFn, 1, 10)).toEqual({ key: "value" });
	});
});

describe("fetchWithRetry", () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("returns response on successful fetch", async () => {
		const mockResponse = new Response("success", { status: 200 });
		globalThis.fetch = mock(() => Promise.resolve(mockResponse));

		const result = await fetchWithRetry("https://example.com", undefined, 3);
		expect(result).toBe(mockResponse);
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	test("retries on network error", async () => {
		let attempts = 0;
		const mockResponse = new Response("success", { status: 200 });

		globalThis.fetch = mock(() => {
			attempts++;
			if (attempts < 3) {
				return Promise.reject(new Error("Network error"));
			}
			return Promise.resolve(mockResponse);
		});

		const result = await fetchWithRetry("https://example.com", undefined, 3);
		expect(result).toBe(mockResponse);
		expect(globalThis.fetch).toHaveBeenCalledTimes(3);
	});

	test("retries on non-ok HTTP status", async () => {
		let attempts = 0;
		const errorResponse = new Response("Server Error", {
			status: 500,
			statusText: "Internal Server Error",
		});
		const successResponse = new Response("success", { status: 200 });

		globalThis.fetch = mock(() => {
			attempts++;
			if (attempts < 2) {
				return Promise.resolve(errorResponse);
			}
			return Promise.resolve(successResponse);
		});

		const result = await fetchWithRetry("https://example.com", undefined, 3);
		expect(result).toBe(successResponse);
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	test("throws after max retries on persistent failure", async () => {
		const errorResponse = new Response("Server Error", {
			status: 500,
			statusText: "Internal Server Error",
		});
		globalThis.fetch = mock(() => Promise.resolve(errorResponse));

		await expect(fetchWithRetry("https://example.com", undefined, 2)).rejects.toThrow(
			"HTTP 500: Internal Server Error",
		);
		expect(globalThis.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
	});

	test("throws after max retries on network errors", async () => {
		globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));

		await expect(fetchWithRetry("https://example.com", undefined, 2)).rejects.toThrow(
			"Network error",
		);
		expect(globalThis.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
	});

	test("passes fetch options correctly", async () => {
		const mockResponse = new Response("success", { status: 200 });
		globalThis.fetch = mock(() => Promise.resolve(mockResponse));

		const options: RequestInit = {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ data: "test" }),
		};

		await fetchWithRetry("https://example.com", options, 1);
		expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com", options);
	});
});
