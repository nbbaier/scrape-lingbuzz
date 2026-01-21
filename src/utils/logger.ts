type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Formats a log message with timestamp and level.
 */
function formatMessage(level: LogLevel, message: string): string {
	const timestamp = new Date().toISOString();
	return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Internal logging function.
 */
function log(level: LogLevel, message: string, data?: unknown): void {
	const formattedMessage = formatMessage(level, message);

	if (data !== undefined) {
		if (level === "error") {
			console.error(formattedMessage, data);
		} else {
			console.log(formattedMessage, data);
		}
	} else {
		if (level === "error") {
			console.error(formattedMessage);
		} else {
			console.log(formattedMessage);
		}
	}
}

/**
 * Simple structured logger with timestamps and log levels.
 */
export const logger = {
	info: (message: string, data?: unknown) => log("info", message, data),
	warn: (message: string, data?: unknown) => log("warn", message, data),
	error: (message: string, data?: unknown) => log("error", message, data),
	debug: (message: string, data?: unknown) => log("debug", message, data),
};
