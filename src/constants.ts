// Base URLs
export const BASE_URL = "https://ling.auf.net/";
export const PAPERS_FILE_PATH = "./papers.json";

// Scraping configuration
export const CHUNK_SIZE = 5; // Number of concurrent requests
export const MAX_RETRIES = 3; // Maximum retry attempts for failed requests
export const RETRY_BASE_DELAY_MS = 1000; // Base delay for exponential backoff

// Pagination configuration (lingbuzz-specific)
export const PAGINATION_FIRST_START = 1; // First page start value
export const PAGINATION_SECOND_START = 31; // Second page start value
export const PAGINATION_INCREMENT = 100; // Increment for subsequent pages

// Paper ID configuration
export const PAPER_ID_LENGTH = 6; // Length of zero-padded paper IDs
export const PAPER_ID_START = 2; // First valid paper ID
