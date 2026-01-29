import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { logger } from "../utils/logger";

describe("logger", () => {
	let originalLog: typeof console.log;
	let originalError: typeof console.error;
	let mockLog: ReturnType<typeof vi.fn>;
	let mockError: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		originalLog = console.log;
		originalError = console.error;
		mockLog = vi.fn(() => {});
		mockError = vi.fn(() => {});
		console.log = mockLog;
		console.error = mockError;
	});

	afterEach(() => {
		console.log = originalLog;
		console.error = originalError;
	});

	test("info logs to console.log with INFO level", () => {
		logger.info("test message");

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockError).not.toHaveBeenCalled();

		const loggedMessage = mockLog.mock.calls[0][0] as string;
		expect(loggedMessage).toContain("[INFO]");
		expect(loggedMessage).toContain("test message");
	});

	test("warn logs to console.log with WARN level", () => {
		logger.warn("warning message");

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockError).not.toHaveBeenCalled();

		const loggedMessage = mockLog.mock.calls[0][0] as string;
		expect(loggedMessage).toContain("[WARN]");
		expect(loggedMessage).toContain("warning message");
	});

	test("error logs to console.error with ERROR level", () => {
		logger.error("error message");

		expect(mockError).toHaveBeenCalledTimes(1);
		expect(mockLog).not.toHaveBeenCalled();

		const loggedMessage = mockError.mock.calls[0][0] as string;
		expect(loggedMessage).toContain("[ERROR]");
		expect(loggedMessage).toContain("error message");
	});

	test("debug logs to console.log with DEBUG level", () => {
		logger.debug("debug message");

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockError).not.toHaveBeenCalled();

		const loggedMessage = mockLog.mock.calls[0][0] as string;
		expect(loggedMessage).toContain("[DEBUG]");
		expect(loggedMessage).toContain("debug message");
	});

	test("includes ISO timestamp in log messages", () => {
		logger.info("test");

		const loggedMessage = mockLog.mock.calls[0][0] as string;
		// ISO timestamp format: YYYY-MM-DDTHH:mm:ss.sssZ
		expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
	});

	test("info passes additional data to console.log", () => {
		const data = { key: "value" };
		logger.info("message with data", data);

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockLog.mock.calls[0][1]).toEqual(data);
	});

	test("error passes additional data to console.error", () => {
		const error = new Error("test error");
		logger.error("error occurred", error);

		expect(mockError).toHaveBeenCalledTimes(1);
		expect(mockError.mock.calls[0][1]).toBe(error);
	});

	test("warn passes additional data to console.log", () => {
		const data = [1, 2, 3];
		logger.warn("warning with data", data);

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockLog.mock.calls[0][1]).toEqual(data);
	});

	test("debug passes additional data to console.log", () => {
		const data = "debug info";
		logger.debug("debugging", data);

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockLog.mock.calls[0][1]).toBe(data);
	});

	test("handles undefined data parameter", () => {
		logger.info("no data");

		expect(mockLog).toHaveBeenCalledTimes(1);
		expect(mockLog.mock.calls[0].length).toBe(1);
	});
});
