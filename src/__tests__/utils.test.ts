import { describe, expect, test } from "bun:test";
import { chunkArray, mapWithConcurrency } from "../utils/utils";

describe("chunkArray", () => {
	test("splits array into chunks of specified size", () => {
		const input = [1, 2, 3, 4, 5, 6];
		const result = chunkArray(input, 2);
		expect(result).toEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		]);
	});

	test("handles array not evenly divisible by chunk size", () => {
		const input = [1, 2, 3, 4, 5];
		const result = chunkArray(input, 2);
		expect(result).toEqual([[1, 2], [3, 4], [5]]);
	});

	test("handles empty array", () => {
		const result = chunkArray([], 3);
		expect(result).toEqual([]);
	});

	test("handles chunk size larger than array", () => {
		const input = [1, 2, 3];
		const result = chunkArray(input, 10);
		expect(result).toEqual([[1, 2, 3]]);
	});

	test("handles chunk size of 1", () => {
		const input = [1, 2, 3];
		const result = chunkArray(input, 1);
		expect(result).toEqual([[1], [2], [3]]);
	});

	test("does not mutate the original array", () => {
		const input = [1, 2, 3, 4, 5];
		const originalLength = input.length;
		chunkArray(input, 2);
		expect(input.length).toBe(originalLength);
		expect(input).toEqual([1, 2, 3, 4, 5]);
	});

	test("works with string arrays", () => {
		const input = ["a", "b", "c", "d"];
		const result = chunkArray(input, 2);
		expect(result).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	test("works with object arrays", () => {
		const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
		const result = chunkArray(input, 2);
		expect(result).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
	});
});

describe("mapWithConcurrency", () => {
	test("maps items with concurrency limit", async () => {
		const items = [1, 2, 3, 4, 5];
		const result = await mapWithConcurrency(items, 2, async (x) => x * 2);
		expect(result).toEqual([2, 4, 6, 8, 10]);
	});

	test("handles empty array", async () => {
		const result = await mapWithConcurrency([], 2, async (x) => x);
		expect(result).toEqual([]);
	});

	test("preserves order of results", async () => {
		const items = [10, 5, 15]; // delays
		const result = await mapWithConcurrency(items, 2, async (ms) => {
			await new Promise((resolve) => setTimeout(resolve, ms));
			return ms;
		});
		expect(result).toEqual([10, 5, 15]);
	});

	test("handles errors in callback", async () => {
		const items = [1, 2, 3];
		const promise = mapWithConcurrency(items, 2, async (x) => {
			if (x === 2) throw new Error("error");
			return x;
		});
		expect(promise).rejects.toThrow("error");
	});
});
