import { describe, expect, test } from "bun:test";
import { chunkArray } from "../utils/utils";

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
