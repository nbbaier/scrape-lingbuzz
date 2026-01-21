import { describe, expect, mock, test } from "bun:test";
import { withRetry } from "../utils/retry";

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
